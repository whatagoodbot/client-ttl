import { stringsDb, greetingsDb, usersDb } from '../models/index.js'

export const addGreeting = async (options) => {
  const failedMessage = { message: `${await stringsDb.get('greetingFailed')} ${options.type}` }
  if (options.argument.length < 2) return failedMessage
  const nickname = options.argument.shift()
  const user = await usersDb.getByName(nickname)
  const userUid = user.id
  const greetingImage = options.argument.join(' ')
  if (greetingsDb.add(userUid, greetingImage, options.type)) return { message: `${options.type} ${await stringsDb.get('greetingAdded')} ${nickname}` }
  return failedMessage
}
