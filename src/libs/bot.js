import { io } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'

import { joinRoom, getMessages } from './cometchat.js'
import { getRoom, getUser } from './ttlive.js'
import { configDb } from '../models/index.js'
import { logger } from '../utils/logging.js'
import { publish, recievedCommand } from './messages.js'
import { delay } from '../utils/timing.js'

const chatConfig = await configDb.get('cometchat')

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
    this.lastPlayed = []
    this.botPlaylist = []
  }

  async publishMessage (topic, message, userId = chatConfig.botId, sender = 'system') {
    const userProfile = await getUser(userId)
    if (!userProfile.nickname) return
    publish(topic, {
      ...message,
      messageId: uuidv4(),
      client: process.env.npm_package_name,
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
        if (!customMessage) return
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

    if (userProfile?.badges && userProfile?.badges.length) {
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

  trackLastPlayed (trackID) {
    this.lastPlayed.push(trackID)
    if (this.lastPlayed.length > 4) this.lastPlayed.shift()
    this.publishMessage('externalRequest', { service: 'spotify-client', name: 'seeds', seedTracks: this.lastPlayed })
  }

  async playNextSongHandler (payload) {
    if (!payload.song) return
    if (this.isDj) {
      const nextTrack = { song: this.botPlaylist[0] }
      this.socket.emit('sendNextTrackToPlay', nextTrack)
      this.botPlaylist.shift()
    }
    let songId = payload.song?.id
    this.trackLastPlayed(songId)
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
    logger.debug('Next DJ Slot', this.findNextFreeDjSeat())
  }

  // TODO: deal with themes
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
        const userProfile = await getUser(payload.djSeats.value[djPosition][1].userUuid)
        nickname = userProfile.nickname
      }
      // this.djs.push({
      //   userId: payload.djSeats.value[djPosition][1].userUuid || undefined,
      //   nickname,
      //   isBot: payload.djSeats.value[djPosition][1].isBot,
      //   nextTrack: {
      //     id: payload?.djSeats?.value[djPosition][1]?.nextTrack?.song?.id,
      //     musicProvider: payload?.djSeats?.value[djPosition][1]?.nextTrack?.song?.musicProvider,
      //     artistName: payload?.djSeats?.value[djPosition][1]?.nextTrack?.song?.artistName,
      //     trackName: payload?.djSeats?.value[djPosition][1]?.nextTrack?.song?.trackName
      //   }
      // })
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
    const beDjPayload = {
      avatarId: chatConfig.avatar.id,
      djSeatKey,
      nextTrack: {
        song: this.botPlaylist[0]
      },
      userUuid: chatConfig.botId,
      isBot: true
    }
    this.socket.emit('takeDjSeat', beDjPayload)
    this.isDj = true
    const msg = {
      key: 'djGroupie',
      category: 'system'
    }
    this.publishMessage('responseRead', msg)
  }

  stepDown () {
    logger.debug('stepDown')
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
