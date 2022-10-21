import { io } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'

import { joinRoom, getMessages } from './cometchat.js'
import { getRoom, getUser } from './ttlive.js'
import { configDb } from '../models/index.js'
import { logger } from '../utils/logging.js'
import { publish, recievedCommand } from './messages.js'
import { delay } from '../utils/timing.js'

const chatConfig = await configDb.get('cometchat')
const tempSong = {
  id: 'spotify:track:45OL4yJZuV5CghHuSoYFSF',
  artistName: 'CHIKA',
  duration: 213,
  genre: 'unknown',
  isrc: 'USWB11901645',
  musicProvider: 'spotify',
  trackName: 'High Rises',
  trackUrl: 'not applicable'
}

export class Bot {
  constructor (roomConfig, debug = false) {
    this.roomConfig = roomConfig
    this.lastMessageIDs = {}
    this.room = {
      slug: roomConfig.slug,
      lastfm: JSON.parse(roomConfig.lastfm),
      spotify: JSON.parse(roomConfig.spotify)
    }
    this.debug = debug
    this.nowPlaying = {
      dj: '',
      id: '',
      provider: '',
      artist: '',
      title: ''
    }
    this.djs = []
    this.isDj = false
  }

  async publishMessage (topic, message, userId, sender = 'system') {
    const userProfile = await getUser(userId)
    if (!userProfile.nickname) return
    publish(topic, {
      ...message,
      messageId: uuidv4(),
      client: 'TTL',
      room: {
        id: this.room.id,
        slug: this.room.slug,
        name: this.room.name,
        lastfm: this.room.lastfm,
        spotify: this.room.spotify
      },
      user: {
        id: userId,
        nickname: userProfile.nickname
      },
      sender,
      nowPlaying: this.nowPlaying,
      djs: this.djs
    })
    logger.debug(`Published ${topic}`)
  }

  async connect () {
    logger.debug('Connecting to room')
    const roomProfile = await getRoom(this.room.slug)
    this.room.id = roomProfile.uuid
    this.room.name = roomProfile.name
    this.socket = io(`https://${roomProfile.socketDomain}`, {
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

    joinRoom(this.roomId)
  }

  async processNewMessages () {
    const response = await getMessages(this.room.id, this.lastMessageIDs?.fromTimestamp)
    const messages = response.data
    if (messages.length) {
      for (const message in messages) {
        const customMessage = messages[message]?.data?.customData?.message ?? ''
        const sender = messages[message]?.sender ?? ''
        this.lastMessageIDs.fromTimestamp = messages[message].sentAt + 1
        if (sender === chatConfig.botId || sender === chatConfig.botReplyId) return
        const msg = {
          chatMessage: customMessage,
          room: this.room.slug,
          sender
        }
        this.publishMessage('chatMessage', msg, sender, sender)
      }
    }
  }

  async startConnectionHandler (payload) {
    if (!payload.userUuid) return
    if (payload.userUuid === chatConfig.botId) return
    const userProfile = await getUser(payload.userUuid)

    this.publishMessage('userConnect', {}, payload.userUuid)

    if (userProfile?.badges.length) {
      await delay(250)
      const msg = {
        key: userProfile?.badges[0],
        category: 'badgeReaction'
      }
      this.publishMessage('responseRead', msg, payload.userUuid)
    }
  }

  userWasDisconnectedHandler (payload) {
    if (!payload.userUuid) return
    if (payload.userUuid === chatConfig.botId) return
    this.publishMessage('userDisconnect', {}, payload.userUuid)
  }

  async playNextSongHandler (payload) {
    if (!payload.song) return
    if (this.isDj) {
      const nextTrack = { song: tempSong }
      this.socket.emit('sendNextTrackToPlay', nextTrack)
    }
    let songId = payload.song?.id
    if (songId.substring(0, 14) === 'spotify:track:') songId = songId.substring(14)
    this.nowPlaying = {
      dj: payload.userUuid,
      id: songId,
      provider: payload.song.musicProvider,
      artist: payload.song.artistName,
      title: payload.song.trackName,
      isBot: payload.userUuid === chatConfig.botId
    }
    this.publishMessage('songPlayed', {}, payload.userUuid)
  }

  sendSatisfactionHandler (payload) {
    const satisfactionMap = {
      approve: 'dope',
      disapprove: 'nope'
    }
    const msg = {
      reaction: satisfactionMap[payload.choice]
    }
    this.publishMessage('songReaction', msg, payload.userUuid)
  }

  addOneTimeAnimationHandler (payload) {
    if (payload.oneTimeAnimation === 'emoji' && payload.animationPayload === '⭐️') {
      const msg = {
        reaction: 'star'
      }
      this.publishMessage('songReaction', msg, payload.userUuid)
    }
  }

  // TODO: deal with themes
  async takeDjSeatHandler (payload) {
    logger.debug('takeDjSeatHandler')
    let nickname = null
    if (payload.userUuid) {
      const userProfile = await getUser(payload.userUuid)
      nickname = userProfile.nickname
    }
    this.djs[payload.djSeatKey] = {
      userId: payload.userUuid,
      nickname,
      isBot: payload.isBot,
      nextTrack: payload.nextTrack
    }
  }

  // TODO: deal with themes
  leaveDjSeatHandler (payload) {
    logger.debug('leaveDjSeatHandler')
    this.djs = this.djs.filter(
      (item) => item.userId !== payload.userUuid
    )
    console.log(this.djs)
  }

  wrongMessagePayloadHandler (payload) {
    logger.debug('wrongMessagePayloadHandler')
    logger.info({
      room: this.room.slug,
      event: 'wrongMessagePayload',
      payload
    })
  }

  async sendInitialStateHandler (payload) {
    logger.debug('sendInitialStateHandler')
    for (const djPosition in payload.djSeats.value) {
      this.djs.push({
        userId: payload.djSeats.value[djPosition].userUuid,
        nickname: payload.djSeats.value[djPosition].userUuid ? await getUser(payload.djSeats.value[djPosition].userUuid) : undefined,
        isBot: payload.djSeats.value[djPosition].isBot,
        nextTrack: payload.djSeats.value[djPosition].nextTrack
      })
    }
  }

  allHandler (event, payload) {
    logger.debug(this.room.slug)
    logger.debug(event)
    logger.debug(payload)
  }

  externalCommandHandler (payload) {
    logger.debug(`Received External Command ${payload.name} for ${payload.room.id}`)
    if (payload.room.id === this.room.id) {
      if (payload.name === 'up') this.stepUp()
      if (payload.name === 'down') this.stepDown()
    }
  }

  configureListeners () {
    logger.debug('Setting up listeners')
    recievedCommand.on('externalRequest', this.externalCommandHandler.bind(this))
    this.socket.on('sendInitialState', this.sendInitialStateHandler.bind(this))
    this.socket.on('startConnection', this.startConnectionHandler.bind(this))
    this.socket.on('userWasDisconnected', this.userWasDisconnectedHandler.bind(this))
    this.socket.on('playNextSong', this.playNextSongHandler.bind(this))
    this.socket.on('sendSatisfaction', this.sendSatisfactionHandler.bind(this))
    this.socket.on('addOneTimeAnimation', this.addOneTimeAnimationHandler.bind(this))
    this.socket.on('takeDjSeat', this.takeDjSeatHandler.bind(this))
    this.socket.on('leaveDjSeat', this.leaveDjSeatHandler.bind(this))
    this.socket.on('wrongMessagePayload', this.wrongMessagePayloadHandler.bind(this))
    if (this.debug) this.socket.onAny(this.allHandler.bind(this))
  }

  stepUp () {
    logger.debug('stepUp')
    if (this.isDj) return
    const djSeatKey = this.findNextFreeDjSeat()
    logger.debug(`Found dj seat ${djSeatKey}`)
    this.socket.emit('takeDjSeat', {
      avatarId: chatConfig.avatar.id,
      djSeatKey,
      nextTrack: {
        song: tempSong
      },
      userUuid: chatConfig.botId,
      isBot: true
    })
    this.isDj = true
    const msg = {
      key: 'djGroupie',
      category: 'system'
    }
    this.publishMessage('responseRead', msg)
  }

  stepDown () {
    logger.debug('stepDown')
    if (!this.isDj) return
    this.socket.emit('leaveDjSeat', {
      userUuid: chatConfig.botId
    })
    this.isDj = false
    const msg = {
      key: 'djGroupieNoMore',
      category: 'system'
    }
    this.publishMessage('responseRead', msg)
  }

  findNextFreeDjSeat () {
    logger.debug('findNextFreeDjSeat')
    return this.djs
      .findIndex((item) => {
        return !item.userId
      })
  }
}
