import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'

import { logger } from '../utils/logging.js'
import { publish, recievedCommand, recievedMessage } from './messages.js'
import { delay } from '../utils/timing.js'
import { getUser } from './grpc.js'

export class Bot {
  constructor (roomConfig, debug = false) {
    this.roomConfig = roomConfig
    this.liveDebug = {
      DJ: false
    }
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
    this.listeners = []
    this.djs = []
    this.isDj = false
    this.lastPlayed = []
    this.botPlaylist = []
    this.reconnectInterval = 2 * 1000
    this.clientId = uuidv4()
    this.connect()
  }

  notImplemented () {
    return this.publishMessage('requestToBroadcast', {
      message: 'Sorry, I can\'t do that just yet'
    })
  }

  async publishMessage (topic, message, userId = process.env.GROUPIE_USER_ID, userName, sender = 'system') {
    if (!userName) {
      const userProfile = await getUser(userId)
      userName = userProfile.name
    }
    publish(topic, {
      ...message,
      messageId: uuidv4(),
      client: 'RVRB',
      room: {
        id: this.room.slug,
        slug: this.room.slug,
        name: this.room.slug,
        lastfm: this.room.lastfm,
        spotify: this.room.spotify
      },
      user: {
        id: userId,
        nickname: userName
      },
      sender,
      nowPlaying: this.nowPlaying,
      djs: this.djs
    })
    logger.debug(`Published ${topic}`)
    if (process.env.FULLDEBUG) console.log(message)
  }

  async connect () {
    logger.debug('Connecting to room')
    this.ws = new WebSocket(`wss://app.rvrb.one/ws?token=${process.env.GROUPIE_RVRB_TOKEN}&clientId=${this.clientId}`)
    this.ws.on('open', () => {
      logger.debug('connected')
      this.ws.send(JSON.stringify(
        {
          method: 'join',
          params: {
            channelId: this.room.slug
          }
          // id:
        }
      ))
    })

    this.ws.on('message', (event) => {
      let data = event.toString()
      try {
        data = JSON.parse(data)
      } catch (error) {
        logger.error('Non-JSON payload', data)
        return
      }
      if (this[data.method]) this[data.method](data)
    })

    this.ws.on('close', () => {
      logger.debug('socket close')
      setTimeout(this.connect.bind(this), this.reconnectInterval)
    })
    logger.debug(`Joining ${this.room.slug}`)
  }

  async pushChannelMessage (payload) {
    const sender = payload.params.userId
    if (sender === process.env.GROUPIE_USER_ID) return
    if (payload.params.payload.substring(0, 5) === 'DEBUG') {
      // const senderConfig = await getUser(sender)
      // if (!senderConfig?.admin) {
      return this.publishMessage('requestToBroadcast', {
        message: 'You\'re not the boss of me'
      })
      // }
      // const args = payload.params.payload.split(' ')
      // const method = args[1]
      // const mode = args[2]
      // this.liveDebug[method] = (mode === 'ON')
      // this.publishMessage('requestToBroadcast', {
      //   message: `Turned ${mode} debug mode for ${method}`
      // })
    }
    const msg = {
      chatMessage: payload.params.payload,
      room: this.room.slug,
      sender
    }
    this.publishMessage('chatMessage', msg, sender, payload.params.userName, sender)
  }

  updateChannelUserStatus () {
    // Do nothing for now
    // Will get either 'typing' boolean or 'afk' integer
  }

  keepAwake () {
    // Do nothing - connection keep alive
  }

  async updateChannelUsers (payload) {
    const users = payload.params.users
    if (this.listeners === users) return
    const presentUserIds = this.listeners.map(listener => {
      return listener._id
    })
    users.forEach(user => {
      if (user._id === process.env.GROUPIE_USER_ID) return
      if (payload.params.type === 'join') {
        if (!presentUserIds.includes(user._id)) this.publishMessage('userConnect', {}, user._id, user.userName)
      } else if (payload.params.type === 'leave') {
        if (presentUserIds.includes(user._id)) this.publishMessage('userDisconnect', {}, user._id, user.userName)
      }
    })
    this.listeners = users
  }

  trackLastPlayed (trackID) {
    this.lastPlayed.push(trackID)
    if (this.lastPlayed.length > 9) this.lastPlayed.shift()
    this.publishMessage('externalRequest', { service: 'spotify-client', name: 'seeds', seedTracks: this.lastPlayed })
  }

  async playChannelTrack (payload) {
    if (!payload.params.track) return
    // Need to check this
    if (this.isDj) {
      const nextTrack = { song: this.botPlaylist[0] }
      this.socket.emit('sendNextTrackToPlay', nextTrack)
      this.botPlaylist.shift()
    }
    const songId = payload.params.track.id
    this.trackLastPlayed(songId)
    this.nowPlaying = {
      dj: this.djs[0].userId,
      id: songId,
      provider: 'spotify',
      artist: payload.params.track.artists[0].name,
      title: payload.params.track.name,
      isBot: payload.params.userId === process.env.GROUPIE_USER_ID
    }
    this.publishMessage('songPlayed', {}, this.djs[0].userId, this.djs[0].nickname)
  }

  // TODO: deal with themes
  // Not Implemented
  async updateChannelDjs (payload) {
    logger.debug('updateChannelDjs')
    this.djs = await Promise.all(payload.params.djs.map(async dj => {
      const user = await getUser(dj)
      return {
        userId: dj,
        nickname: user.name,
        isBot: false,
        nextTrack: {}
      }
    }))
    logger.debug('Next DJ Slot', this.findNextFreeDjSeat())
  }

  // TODO: deal with themes
  // Not Implemented
  leaveDjSeatHandler (payload) {
    logger.debug('leaveDjSeatHandler')
    this.djs = this.djs.filter(
      (item) => item.userId !== payload.params.userId
    )
    logger.debug('Next DJ Slot', this.findNextFreeDjSeat())
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
    recievedMessage.on('externalMessage', this.postMessage.bind(this))
  }

  stepUp () {
    return notImplemented()
    logger.debug('stepUp')
    if (this.liveDebug.DJ) {
      let nextSong = 'not known'
      if (this.botPlaylist[0]?.trackName && this.botPlaylist[0]?.artistName) {
        nextSong = `${this.botPlaylist[0]?.trackName} by ${this.botPlaylist[0]?.artistName}`
      }
      this.publishMessage('requestToBroadcast', {
        message: `DEBUG: Already DJ = ${this.isDj}. Next Free seat = ${this.findNextFreeDjSeat()}. Next Song is ${nextSong}`
      })
    }
    if (this.isDj) return
    if (this.botPlaylist[0] === undefined) {
      return this.publishMessage('requestToBroadcast', {
        message: 'I haven\'t heard enough songs yet, so I\'m not sure what to play - I need to jam to at least 1 song'
      })
    }
    const djSeatKey = this.findNextFreeDjSeat()
    logger.debug(`Found dj seat ${djSeatKey}`)
    const beDjPayload = {
      avatarId: chatConfig.avatar.id,
      djSeatKey,
      nextTrack: {
        song: this.botPlaylist[0]
      },
      userUuid: process.env.GROUPIE_USER_ID,
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
    return notImplemented
    logger.debug('stepDown')
    this.socket.emit('leaveDjSeat', {
      userUuid: process.env.GROUPIE_USER_ID
    })
    this.isDj = false
    const msg = {
      key: 'djGroupieNoMore',
      category: 'system'
    }
    this.publishMessage('responseRead', msg)
  }

  findNextFreeDjSeat () {
    return
    logger.debug('findNextFreeDjSeat')
    return this.djs
      .findIndex((item) => {
        return !item.userId
      })
  }

  async postMessage (payload) {
    if (payload.message && !payload.image) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'pushMessage',
        params: {
          payload: payload.message,
          flair: null
        }
      }))
    }
    if (payload.image && !payload.message) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'pushMessage',
        params: {
          payload: payload.image,
          flair: null
        }
      }))
    }
    if (payload.image && payload.message) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'pushMessage',
        params: {
          payload: payload.message,
          flair: null
        }
      }))
      await delay(250)
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'pushMessage',
        params: {
          payload: payload.image,
          flair: null
        }
      }))
    }
  }
}
