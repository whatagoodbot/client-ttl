import broker from 'message-broker'

import { postMessage } from '../libs/cometchat.js'
import { stringsDb } from '../models/index.js'
import { metrics } from '../utils/metrics.js'

export default {
  getResponseReply: async (data) => {
    const validatedResponse = broker.getResponse.response.validate(data)
    if (validatedResponse.errors) throw { message: validatedResponse.errors } // eslint-disable-line
    if (data.payload) {
      delete data.payload.errors
      if (!data.payload.message) data.payload.message = ''

      return postMessage({ roomId: data.meta.roomUuid, ...data.payload })
    }
    // We should never get here
    metrics.count('noReply', { function: 'getReply' })
    postMessage({ roomId: data.meta.roomUuid, message: await stringsDb.get('noComprende') })
  },
  getAllResponsesReply: async (data) => {
    const validatedResponse = broker.getAllResponses.response.validate(data)
    if (validatedResponse.errors) throw { message: validatedResponse.errors } // eslint-disable-line
    if (data.payload.errors) {
      delete data.payload.errors
      return postMessage({ roomId: data.meta.roomUuid, ...data.payload })
    }
    postMessage({ roomId: data.meta.roomUuid, message: `${await stringsDb.get('aliases')} ${[...new Set(data.payload.map(response => response.key))].join(', ')}` })
  },
  addResponseReply: async (data) => {
    const validatedResponse = broker.addResponse.response.validate(data)
    if (validatedResponse.errors) throw { message: validatedResponse.errors } // eslint-disable-line
    postMessage({ roomId: data.meta.roomUuid, message: `${await stringsDb.get('aiasAdded')} "${data.meta.key}"` })
  },
  // This should end up being the only response handler
  broadcastMessage: async(data) => {
    const validatedResponse = broker.broadcastMessage.validate(data)
    if (validatedResponse.errors) throw { message: validatedResponse.errors } // eslint-disable-line
    const newObject = { roomId: data.meta.roomUuid, ...data.response }
    postMessage(newObject)

  }
}
