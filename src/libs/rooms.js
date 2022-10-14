import { io } from 'socket.io-client'
import { Chain } from 'repeat'

import { joinRoom, getMessages } from './cometchat.js'
import { getRoom, getUser } from './ttlive.js'
import { configDb } from '../models/index.js'
import { logger } from '../utils/logging.js'

import { djInRooms, botDjSongs } from '../commands/beDJ.js'
import { publish } from '../libs/messages.js'
import { delay } from '../utils/timing.js'

const chatConfig = await configDb.get('cometchat')
const lastMessageIDs = {}

export const connectToRoom = async (roomConfig) => {
  const roomProfile = await getRoom(roomConfig.slug)
  console.log(roomProfile.uuid)
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

  configureListeners(socket, roomProfile, roomConfig)
}

const configureListeners = async (socket, roomProfile, roomConfig) => {
  socket.on('startConnection', async (payload) => {
    if (!payload.userUuid) return
    if (payload.userUuid === chatConfig.botId) return
    const userProfile = await getUser(payload.userUuid)
    if (!userProfile.nickname) return

    publish('userConnect', {
      room: roomProfile.slug,
      nickname: userProfile.nickname,
      userId: payload.userUuid,
      meta: {
        roomUuid: roomProfile.uuid,
        room: roomProfile.slug,
        user: {
          id: payload.userUuid,
          nickname: userProfile.nickname
        },
        sender: 'system'
      }
    })

    if (userProfile?.badges.length) {
      await delay(250)
      publish('responseRead', {
        key: userProfile?.badges[0],
        category: 'badgeReaction',
        meta: { roomUuid: roomProfile.uuid, sender: 'system' }
      })
    }
  })

  socket.on('userWasDisconnected', async (payload) => {
    if (!payload.userUuid) return
    if (payload.userUuid === chatConfig.botId) return
    const userProfile = await getUser(payload.userUuid)
    publish('userDisconnect', {
      userId: payload.userUuid,
      meta: {
        roomUuid: roomProfile.uuid,
        room: roomProfile.slug,
        user: {
          id: payload.userUuid,
          nickname: userProfile.nickname
        },
        sender: 'system'
      }
    })
  })

  socket.on('playNextSong', async (payload) => {
    if (!payload.song) return

    const userProfile = await getUser(payload.userUuid)
    if (!userProfile.nickname) return

    if (djInRooms[roomProfile.slug]) {
      const nextTrack = { song: botDjSongs[Math.floor(Math.random() * botDjSongs.length)] }
      socket.emit('sendNextTrackToPlay', nextTrack)
    }

    let songId = payload.song?.id
    if (songId.substring(0, 14) === 'spotify:track:') songId = songId.substring(14)

    publish('songPlayed', {
      artist: payload.song.artistName,
      title: payload.song.trackName,
      dj: {
        userId: payload.userUuid,
        nickname: userProfile.nickname,
        isBot: payload.userUuid === chatConfig.botId
      },
      details: {
        id: songId,
        provider: payload.song?.musicProvider
      },
      room: roomProfile.slug,
      meta: {
        roomUuid: roomProfile.uuid,
        room: roomProfile.slug,
        user: {
          id: payload.userUuid,
          nickname: userProfile.nickname
        },
        sender: 'system',
        roomConfig
      }
    })
  })

  socket.on('sendSatisfaction', async (payload) => {
    const userProfile = await getUser(payload.userUuid)
    const satisfactionMap = {
      approve: 'dope',
      disapprove: 'nope'
    }
    publish('songReaction', {
      room: roomProfile.slug,
      userId: payload.userUuid,
      reaction: satisfactionMap[payload.choice],
      meta: {
        roomUuid: roomProfile.uuid,
        room: roomProfile.slug,
        user: {
          id: payload.userUuid,
          nickname: userProfile.nickname
        },
        sender: 'system'
      }
    })
  })

  socket.on('addOneTimeAnimation', async (payload) => {
    if (payload.oneTimeAnimation === 'emoji' && payload.animationPayload === '⭐️') {
      const userProfile = await getUser(payload.userUuid)
      publish('songReaction', {
        room: roomProfile.slug,
        userId: payload.userUuid,
        reaction: 'star',
        meta: {
          roomUuid: roomProfile.uuid,
          room: roomProfile.slug,
          user: {
            id: payload.userUuid,
            nickname: userProfile.nickname
          },
          sender: 'system'
        }
      })
    }
  })

  socket.on('takeDjSeat', async (payload) => {
    // djSeatsDb.upsert(payload.userUuid, roomProfile.slug, payload.djSeatKey)
    // const seatChangedMessage = await changeQuickThemeSeats(roomProfile.slug)
    // seatChangedMessage?.forEach(message => {
    //   postMessage({ roomId: roomProfile.uuid, message })
    // })
  })

  socket.on('leaveDjSeat', async (payload) => {
    // djSeatsDb.update({
    //   user: payload.userUuid,
    //   room: roomProfile.slug
    // }, {
    //   user: null
    // })
    // const seatChangedMessage = await changeQuickThemeSeats(roomProfile.slug)
    // seatChangedMessage?.forEach(message => {
    //   postMessage({ roomId: roomProfile.uuid, message })
    // })
  })

  // socket.on('sendInitialState', (payload) => {
  //   console.log('Initial State')
  //   console.log(payload)
  // })

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
    for (const message in messages) {
      const customMessage = messages[message]?.data?.customData?.message ?? ''
      const sender = messages[message]?.sender ?? ''
      lastMessageIDs[roomProfile.uuid].fromTimestamp = messages[message].sentAt + 1
      if (sender === chatConfig.botId || sender === chatConfig.botReplyId) return
      const userProfile = await getUser(sender)
      publish('chatMessage', {
        message: customMessage,
        room: roomProfile.slug,
        sender,
        meta: {
          roomUuid: roomProfile.uuid,
          room: roomProfile.slug,
          user: {
            id: sender,
            nickname: userProfile.nickname
          },
          sender
        }
      })
    }
  }
}
