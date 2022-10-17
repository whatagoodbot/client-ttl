import { io } from 'socket.io-client'
import { Chain } from 'repeat'

import { joinRoom, postMessage, getMessages } from './cometchat.js'
import { getRoom, getUser } from './ttlive.js'
import * as commands from '../commands/index.js'
import { createLastfmInstance, scrobbleTrack } from './lastfm.js'
import { configDb, greetingsDb, userPlaysDb, playReactionsDb, usersDb, djSeatsDb, stringsDb } from '../models/index.js'
import { clearRo } from '../commands/ro.js'
import { logger } from '../utils/logging.js'
import { get as getQuickTheme, progress as progressQuickTheme, changeSeats as changeQuickThemeSeats } from './quickThemes.js'
import { djInRooms, botDjSongs } from '../commands/beDJ.js'
import { publish } from '../libs/messages.js'

const chatConfig = await configDb.get('cometchat')
const lastMessageIDs = {}
const durationUntilNextGreeting = (5 * 60) * 1000

export const connectToRoom = async (roomConfig, defaultLastfmInstance) => {
  const roomProfile = await getRoom(roomConfig.slug)
  await joinRoom(roomProfile.uuid)
  lastMessageIDs[roomProfile.uuid] = {}

  const socket = io(`https://${roomProfile.socketDomain}`, {
    path: roomProfile.socketPath,
    transportOptions: {
      polling: {
        extraHeaders: {
          authorization: `Bearer ${process.env.TTL_BOT_TOKEN}`
        }
      }
    },
    reconnectionAttempts: 7,
    reconnectionDelay: 5000,
    reconnection: true
  })

  const repeatedTasks = new Chain()
  repeatedTasks
    .add(() => processNewMessages(roomProfile, socket))
    .every(500)

  let roomLastfmInstance
  try {
    roomConfig.lastfm = JSON.parse(roomConfig.lastfm)
  } catch (error) {
    logger.info(error)
  }
  if (roomConfig?.lastfm?.enabled) {
    roomLastfmInstance = await createLastfmInstance({
      api_key: process.env[roomConfig.lastfm.environmentVariables.api_key],
      api_secret: process.env[roomConfig.lastfm.environmentVariables.api_secret],
      username: process.env[roomConfig.lastfm.environmentVariables.username],
      password: process.env[roomConfig.lastfm.environmentVariables.password]
    })
  }

  configureListeners(socket, roomProfile, defaultLastfmInstance, roomLastfmInstance)
}

const configureListeners = async (socket, roomProfile, defaultLastfmInstance, roomLastfmInstance) => {
  socket.on('playNextSong', async (payload) => {
    clearRo(roomProfile.slug)
    if (!payload.song) return

    const userProfile = await getUser(payload.userUuid)
    if (!userProfile.nickname) return

    let songId = payload.song?.id
    if (songId.substring(0, 14) === 'spotify:track:') songId = songId.substring(14)

    scrobbleTrack(defaultLastfmInstance, payload.song.artistName, payload.song.trackName)
    if (roomLastfmInstance) {
      scrobbleTrack(roomLastfmInstance, payload.song.artistName, payload.song.trackName, roomProfile.slug)
    }
    // let playedBy = ` - played by ${userProfile.nickname}`
    // if (payload.userUuid === chatConfig.botId) {
    //   const gloatMessagesFromDb = [
    //     'botGloat1',
    //     'botGloat2',
    //     'botGloat3',
    //     'botGloat4',
    //     'botGloat5',
    //     'botGloat6',
    //     'botGloat7',
    //     'botGloat8',
    //     'botGloat9',
    //     'botGloat10'
    //   ]
    // const gloatMessages = await stringsDb.getMany(gloatMessagesFromDb)
    // const gloatMessagetring = gloatMessagesFromDb[Math.floor(Math.random() * gloatMessagesFromDb.length)]
    // playedBy = `${gloatMessages[gloatMessagetring]}`
    // }
    // postMessage({ roomId: roomProfile.uuid, message: `💽 ${payload.song.artistName}: ${payload.song.trackName} ${playedBy}` })

    const currentTheme = await getQuickTheme(roomProfile.slug)
    let themeId
    if (currentTheme) {
      themeId = currentTheme?.quickThemeTracker?.currentTheme
      const messages = await progressQuickTheme(currentTheme, payload.userUuid, roomProfile.slug)
      messages?.forEach(message => {
        postMessage({ roomId: roomProfile.uuid, message })
      })
    }
    userPlaysDb.add(payload.userUuid, roomProfile.slug, payload.song.artistName, payload.song.trackName, songId, payload.song?.musicProvider, themeId)
  })

  socket.on('sendSatisfaction', async (payload) => {
    const satisfactionMap = {
      approve: 'dope',
      disapprove: 'nope'
    }
    const play = await userPlaysDb.getCurrent(roomProfile.slug)
    playReactionsDb.add(play.id, satisfactionMap[payload.choice], payload.userUuid)
  })

  socket.on('addOneTimeAnimation', async (payload) => {
    if (payload.oneTimeAnimation === 'emoji' && payload.animationPayload === '⭐️') {
      const play = await userPlaysDb.getCurrent(roomProfile.slug)
      playReactionsDb.add(play.id, 'star', payload.userUuid)
    }
  })

  socket.on('takeDjSeat', async (payload) => {
    djSeatsDb.upsert(payload.userUuid, roomProfile.slug, payload.djSeatKey)
    const seatChangedMessage = await changeQuickThemeSeats(roomProfile.slug)
    seatChangedMessage?.forEach(message => {
      postMessage({ roomId: roomProfile.uuid, message })
    })
  })
  socket.on('playNextSong', async (payload) => {
    if (djInRooms[roomProfile.slug]) {
      const nextTrack = { song: botDjSongs[Math.floor(Math.random() * botDjSongs.length)] }
      socket.emit('sendNextTrackToPlay', nextTrack)
    }
  })

  socket.on('leaveDjSeat', async (payload) => {
    djSeatsDb.update({
      user: payload.userUuid,
      room: roomProfile.slug
    }, {
      user: null
    })
    const seatChangedMessage = await changeQuickThemeSeats(roomProfile.slug)
    seatChangedMessage?.forEach(message => {
      postMessage({ roomId: roomProfile.uuid, message })
    })
  })

  socket.on('userWasDisconnected', (payload) => {
    if (!payload.userUuid) return
    if (payload.userUuid === chatConfig.botId) return
    usersDb.updateLastDisconnected(payload.userUuid)
  })

  // socket.on('sendInitialState', (payload) => {
  //   console.log('Initial State')
  //   console.log(payload)
  // })

  socket.on('startConnection', async (payload) => {
    if (!payload.userUuid) return
    if (payload.userUuid === chatConfig.botId) return

    const user = await usersDb.get(payload.userUuid)
    const userLastWelcomed = user?.lastWelcomed
    if (userLastWelcomed) {
      if (new Date() - new Date(userLastWelcomed) < durationUntilNextGreeting) return
    }
    const userLastDisconnected = user?.lastDisconnected
    if (userLastDisconnected) {
      if (new Date() - new Date(userLastDisconnected) < durationUntilNextGreeting) return
    }

    const userProfile = await getUser(payload.userUuid)
    if (!userProfile.nickname) return
    usersDb.updateLastWelcomed(payload.userUuid, userProfile.nickname)

    const greetings = await greetingsDb.get(payload.userUuid)
    const randomGreeting = Math.floor(Math.random() * greetings.messages.length)
    const userMention = {
      start: 0,
      userNickname: userProfile.nickname,
      userUuid: payload.userUuid
    }
    if (userProfile.nickname && payload.userUuid) {
      const options = {
        roomId: roomProfile.uuid,
        mentions: [userMention],
        message: `@${userProfile.nickname} is here. ${greetings.messages[randomGreeting]}`
      }
      if (greetings.images) {
        options.images = [
          greetings.images[Math.floor(Math.random() * greetings.images.length)]
        ]
      }
      postMessage(options)
      if (userProfile?.badges.includes('STAFF')) {
        const staffWelcomeNames = [
          'staffWelcome1',
          'staffWelcome2',
          'staffWelcome3',
          'staffWelcome4',
          'staffWelcome5',
          'staffWelcome6'
        ]
        const staffWelcomes = await stringsDb.getMany(staffWelcomeNames)
        const staffWelcomeString = staffWelcomeNames[Math.floor(Math.random() * staffWelcomeNames.length)]
        const randomStaffWelcome = staffWelcomes[staffWelcomeString]
        postMessage({ roomId: roomProfile.uuid, message: randomStaffWelcome })
      }
    }
  })

  socket.on('wrongMessagePayload', (payload) => {
    logger.info(JSON.stringify({
      room: roomProfile.slug,
      event: 'wrongMessagePayload',
      payload
    }))
  })

  // This creates a memory leak crashing the whole server
  //  socket.onAny((event, payload) => {
  // console.log(event)
  // console.log(JSON.stringify({
  //   room: roomProfile.slug,
  //   event,
  //   payload
  // }))
  //  })
}

const processNewMessages = async (roomProfile, socket) => {
  const response = await getMessages(roomProfile.uuid, lastMessageIDs[roomProfile.uuid]?.fromTimestamp)
  const messages = response.data
  if (messages.length) {
    messages.forEach(message => {
      const customMessage = message?.data?.customData?.message ?? ''
      const sender = message?.sender ?? ''
      lastMessageIDs[roomProfile.uuid].fromTimestamp = message.sentAt + 1
      if (sender === chatConfig.botId || sender === chatConfig.botReplyId) return
      commands.findCommandsInMessage(message?.data?.customData?.message, roomProfile, sender, socket)
      publish('chatMessage', { message: customMessage, room: roomProfile.slug, sender, meta: { roomUuid: roomProfile.uuid } })
    })
  }
}
