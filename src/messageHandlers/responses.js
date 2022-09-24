import { postMessage } from '../libs/cometchat.js'
import { stringsDb } from '../models/index.js'

export default {
  getReply: async (payload) => {
    if (payload.response.length) {
      const reply = {
        message: ''
      }
      const response = payload.response[Math.floor(Math.random() * payload.response.length)]
      if (response.type === 'text') {
        reply.message = response.value
      } else if (response.type === 'image') {
        reply.images = [response.value]
      }
      return postMessage({ roomId: payload.request.roomUuid, ...reply })
    }
    postMessage({ roomId: payload.request.roomUuid, message: await stringsDb.get('noComprende') })
  },
  getAllReply: async (payload) => {
    postMessage({ roomId: payload.request.roomUuid, message: `${await stringsDb.get('aliases')} ${[...new Set(payload.response.map(response => response.name))].join(', ')}` })
  },
  addReply: async (payload) => {
    postMessage({ roomId: payload.request.roomUuid, message: `${await stringsDb.get('aiasAdded')} "${payload.request.name}"` })
  }
}
