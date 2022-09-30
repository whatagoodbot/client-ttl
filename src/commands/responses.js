import { stringsDb } from '../models/index.js'
import { publish } from '../libs/messages.js'

export const respond = async (options) => {
  publish('get', { room: options.roomProfile.slug, key: options.command, meta: { roomUuid: options.roomProfile.uuid } })
}

export const getResponses = async (options) => {
  publish('getAll', { room: options.roomProfile.slug, meta: { roomUuid: options.roomProfile.uuid } })
}

export const addResponse = async (options) => {
  const key = options.argument.shift()
  const type = options.argument.shift()
  const value = options.argument.join(' ')
  if (options.commands.includes(key)) return { message: await stringsDb.get('aliasConflict') }
  if (['image', 'text'].includes(type) && key && value) {
    publish('add', {
      room: options.roomProfile.slug,
      type,
      value,
      key,
      meta: {
        roomUuid: options.roomProfile.uuid
      }
    })
  } else {
    return { message: await stringsDb.get('aliasError') }
  }
}
