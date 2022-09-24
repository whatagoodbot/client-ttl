import { postMessage } from '../libs/cometchat.js'
import { stringsDb, configDb, userPlaysDb, playReactionsDb } from '../models/index.js'

import getJoke from './dadjoke.js'
import relink from './relink.js'
import weather from './weather.js'
import giphy from './giphy.js'
import { quicktheme as qt } from './quickThemes.js'
import { ro } from './ro.js'
import yt from './youtube.js'

import { addGreeting } from './greetings.js'
import { respond, addResponse, getResponses } from './responses.js'

const commands = {
  addgreeting: async (options) => {
    options.type = 'text'
    return await addGreeting(options)
  },
  addgreetingimage: async (options) => {
    options.type = 'image'
    return await addGreeting(options)
  },
  alias: async (options) => {
    options.commands = getcommands()
    return await addResponse(options)
  },
  aliases: getResponses,
  dadjoke: getJoke,
  giphy,
  help: async (options) => {
    return { message: `${await stringsDb.get('helpIdentifier')} ${options.botConfig.commandIdentifier}. ${await stringsDb.get('helpCommands')} ${getcommands().join(', ')}` }
  },
  leaderboard: async (options) => {
    return await playReactionsDb.getReactionTable(options)
  },
  mydopes: async (options) => {
    options.type = 'dope'
    return await playReactionsDb.getUserReactions(options)
  },
  mynopes: async (options) => {
    options.type = 'nope'
    return await playReactionsDb.getUserReactions(options)
  },
  mystars: async (options) => {
    options.type = 'star'
    return await playReactionsDb.getUserReactions(options)
  },
  myspins: async (options) => {
    options.getPlaysForKey = 'user'
    options.getPlaysForValue = options.sender
    return await userPlaysDb.getPlays(options)
  },
  mystats: async (options) => {
    options.getPlaysForKey = 'user'
    options.getPlaysForValue = options.sender
    const promises = [
      userPlaysDb.getPlays(options),
      playReactionsDb.getUserReactions({ type: 'dope', ...options }),
      playReactionsDb.getUserReactions({ type: 'nope', ...options }),
      playReactionsDb.getUserReactions({ type: 'star', ...options })
    ]
    const reply = await Promise.all(promises)
      .then((returnedPromises) => {
        return returnedPromises.map((returnedPromise) => {
          return returnedPromise.message
        })
      })
    return { messages: reply }
  },
  relink,
  ro,
  roomdopes: async (options) => {
    options.type = 'dope'
    return await playReactionsDb.getRoomReactions(options)
  },
  roomfavourite: async (options) => {
    return await playReactionsDb.getRoomFavourite(options)
  },
  roomnopes: async (options) => {
    options.type = 'nope'
    return await playReactionsDb.getRoomReactions(options)
  },
  roomstars: async (options) => {
    options.type = 'star'
    return await playReactionsDb.getRoomReactions(options)
  },
  roomspins: async (options) => {
    options.getPlaysForKey = 'room'
    options.getPlaysForValue = options.roomProfile.slug
    return await userPlaysDb.getPlays(options)
  },
  roomstats: async (options) => {
    options.getPlaysForKey = 'room'
    options.getPlaysForValue = options.sender
    const promises = [
      userPlaysDb.getPlays(options),
      playReactionsDb.getRoomReactions({ type: 'dope', ...options }),
      playReactionsDb.getRoomReactions({ type: 'nope', ...options }),
      playReactionsDb.getRoomReactions({ type: 'star', ...options })
    ]
    const reply = await Promise.all(promises)
      .then((returnedPromises) => {
        return returnedPromises.map((returnedPromise) => {
          return returnedPromise.message
        })
      })
    return { messages: reply }
  },
  qt,
  weather,
  yt
}

const getcommands = () => { return Object.keys(commands) }

export const findCommandsInMessage = async (message, roomProfile, sender) => {
  const botConfig = await configDb.get('whatAGoodBot')
  if (!roomProfile.uuid) return
  if (message && message.length > 1 && message?.substring(0, 1) === botConfig.commandIdentifier) {
    const options = {
      roomId: roomProfile.uuid,
      message: ''
    }

    const separatorPosition = message.indexOf(' ') > 0 ? message.indexOf(' ') : message.length
    const command = message?.substring(1, separatorPosition)
    let argument
    if (separatorPosition > 0) {
      argument = message?.substring(separatorPosition + 1)
    }
    if (argument) argument = argument.split(' ')
    const response = await (getcommands().includes(command) ? commands[command] : respond)({
      command,
      argument,
      botConfig,
      roomProfile,
      sender
    })
    if (!response) return
    if (response?.dontRespond) return
    if (response?.messages) {
      response.messages.forEach(message => {
        postMessage({ roomId: roomProfile.uuid, message })
      })
    } else {
      const replyPayload = { ...options, ...response }
      postMessage(replyPayload)
    }
  }
}
