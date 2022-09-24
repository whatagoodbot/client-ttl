import { stringsDb } from '../models/index.js'
import { publish } from '../libs/mqtt.js'

export const respond = async (options) => {
  publish('get', { room: options.roomProfile.slug, name: options.command, roomUuid: options.roomProfile.uuid })
}

export const getResponses = async (options) => {
  publish('getAll', { room: options.roomProfile.slug, roomUuid: options.roomProfile.uuid })
}

export const addResponse = async (options) => {
  const name = options.argument.shift()
  const type = options.argument.shift()
  const value = options.argument.join(' ')
  if (options.commands.includes(name)) return { message: await stringsDb.get('aliasConflict') }
  if (['image', 'text'].includes(type) && name && value) {
    publish('add', {
      room: options.roomProfile.slug,
      roomUuid: options.roomProfile.uuid,
      type,
      value,
      name
    })
  } else {
    return { message: await stringsDb.get('aliasError') }
  }
}
