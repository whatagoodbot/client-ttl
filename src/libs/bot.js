import { io } from 'socket.io-client'

import { joinChat, getMessages } from './cometchat.js'
import { getRoom, joinRoom, joinChatRoom, getTTUser } from './ttlive.js'
import { logger } from '../utils/logging.js'
import { handlers } from '../handlers/index.js'

export class Bot {
  constructor (slug) {
    this.lastMessageIDs = {}
    this.room = {
      slug
    }
    this.nowPlaying = {
      dj: '',
      id: '',
      provider: '',
      artist: '',
      title: ''
    }
    this.djs = []
    this.isDj = false
    this.lastPlayed = []
    this.botPlaylist = []
    this.debug = true
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

    await joinChat(this.room.id)
    logger.debug(`Joining ${this.room.slug}: ${this.room.id}`)
    await joinRoom(this.room.slug)
    await joinChatRoom(this.room.id)
  }

  async processNewMessages () {
    const response = await getMessages(this.room.id, this.lastMessageIDs?.fromTimestamp)
    if (response?.data) {
      const messages = response.data
      if (messages?.length) {
        for (const message in messages) {
          this.lastMessageIDs.fromTimestamp = messages[message].sentAt + 1
          const customMessage = messages[message]?.data?.customData?.message ?? ''
          if (!customMessage) return
          const sender = messages[message]?.sender ?? ''
          if ([process.env.CHAT_USER_ID, process.env.CHAT_REPLY_ID].includes(sender)) return
          handlers.message({
            message: customMessage,
            room: this.room,
            sender,
            senderName: messages[message]?.data?.customData?.userName
          })
        }
      }
    }
  }

  trackLastPlayed (trackID) {
    this.lastPlayed.push(trackID)
    if (this.lastPlayed.length > 9) this.lastPlayed.shift()
    this.publishMessage('externalRequest', { service: 'spotify-client', name: 'seeds', seedTracks: this.lastPlayed })
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

  async takeDjSeatHandler (payload) {
    logger.debug('takeDjSeatHandler')
    let nickname = null
    if (payload.userUuid) {
      const userProfile = await getTTUser(payload.userUuid)
      nickname = userProfile.nickname
    }
    this.djs[payload.djSeatKey] = {
      userId: payload.userUuid,
      nickname,
      isBot: payload.isBot,
      nextTrack: payload.nextTrack
    }
    logger.debug('Next DJ Slot', this.findNextFreeDjSeat())
  }

  leaveDjSeatHandler (payload) {
    logger.debug('leaveDjSeatHandler')
    this.djs = this.djs.filter(
      (item) => item.userId !== payload.userUuid
    )
    logger.debug('Next DJ Slot', this.findNextFreeDjSeat())
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
    if (!payload?.djSeats?.value) return
    for (const djPosition in payload.djSeats.value) {
      let nickname
      if (payload.djSeats.value[djPosition][1].userUuid) {
        const userProfile = await getTTUser(payload.djSeats.value[djPosition][1].userUuid)
        nickname = userProfile.nickname
      }
      this.djs.push({
        userId: payload.djSeats.value[djPosition][1].userUuid || undefined,
        nickname,
        isBot: payload.djSeats.value[djPosition][1].isBot
      })
    }
  }

  allHandler (event, payload) {
    logger.debug(this.room.slug)
    logger.debug(event)
    logger.debug(payload)
  }

  updateBotPlaylist (payload) {
    this.botPlaylist = payload.nextTracks.map(track => {
      return {
        id: track.uri,
        artistName: track.artists[0].name,
        duration: track.duration_ms / 1000,
        musicProvider: 'spotify',
        trackName: track.name,
        trackUrl: track.href
      }
    })
  }

  externalCommandHandler (payload) {
    logger.debug(`Received External Command ${payload.name} for ${payload.room.id}`)
    if (payload.room.id === this.room.id) {
      if (payload.name === 'up') this.stepUp()
      if (payload.name === 'down') this.stepDown()
      if (payload.name === 'updateBotPlaylist') this.updateBotPlaylist(payload)
    }
  }

  configureListeners () {
    logger.debug('Setting up listeners')
    // this.socket.on('sendInitialState', this.sendInitialStateHandler.bind(this))
    this.socket.on('addAvatarToDancefloor', payload => { handlers.userJoined(payload, this.room) })
    this.socket.on('startConnection', payload => { handlers.userJoined(payload, this.room) })
    // this.socket.on('userWasDisconnected', payload => { handlers.userLeft(payload, this.room) })
    this.socket.on('playNextSong', payload => { handlers.songPlayed(payload, this.room) })
    // this.socket.on('sendSatisfaction', this.sendSatisfactionHandler.bind(this))
    // this.socket.on('addOneTimeAnimation', this.addOneTimeAnimationHandler.bind(this))
    // this.socket.on('takeDjSeat', this.takeDjSeatHandler.bind(this))
    // this.socket.on('leaveDjSeat', this.leaveDjSeatHandler.bind(this))
    // this.socket.on('wrongMessagePayload', this.wrongMessagePayloadHandler.bind(this))
    if (this.debug) this.socket.onAny(this.allHandler.bind(this))
  }
}
