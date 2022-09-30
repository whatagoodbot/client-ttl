import { postMessage } from '../libs/cometchat.js'
import { stringsDb } from '../models/index.js'
import { metrics } from '../utils/metrics.js'

export default {
  getReply: async (data) => {
    if (data.payload) {
      delete data.payload.errors
      if (!data.payload.message) data.payload.message = ''

      return postMessage({ roomId: data.meta.roomUuid, ...data.payload })
    }
    // We should never get here
    metrics.count('noReply', { function: 'getReply' })
    postMessage({ roomId: data.meta.roomUuid, message: await stringsDb.get('noComprende') })
  },
  getAllReply: async (data) => {
    if (data.payload.errors) {
      delete data.payload.errors
      return postMessage({ roomId: data.meta.roomUuid, ...data.payload })
    }
    postMessage({ roomId: data.meta.roomUuid, message: `${await stringsDb.get('aliases')} ${[...new Set(data.payload.map(response => response.key))].join(', ')}` })
  },
  addReply: async (data) => {
    postMessage({ roomId: data.meta.roomUuid, message: `${await stringsDb.get('aiasAdded')} "${data.meta.key}"` })
  }
}
