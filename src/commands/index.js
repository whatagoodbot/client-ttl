import { postMessage } from '../libs/cometchat.js'
// import { stringsDb, configDb, userPlaysDb, playReactionsDb } from '../models/index.js'

import relink from './relink.js'
import { quicktheme as qt } from './quickThemes.js'

import { up, down } from './beDJ.js'

// const commands = {
//   qt,
//   up,
//   down
// }

// const getcommands = () => { return Object.keys(commands) }

// export const findCommandsInMessage = async (message, roomProfile, sender, socket) => {
  const botConfig = await configDb.get('whatAGoodBot')
  if (!roomProfile.uuid) return
  if (message && message.length > 1) {
    if (message?.substring(0, 1) === botConfig.commandIdentifier) {
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
        sender,
        socket
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
}
