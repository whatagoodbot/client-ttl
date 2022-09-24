import { roomsDb } from '../models/index.js'

export const ro = async (options) => {
  const repeaterResponse = repeater(options.roomProfile.slug, options.sender)
  if (!repeaterResponse) return { dontRespond: true }
  const response = {}
  response.message = repeaterResponse?.message
  const roomConfig = await roomsDb.get(options.roomProfile.slug)
  if (repeaterResponse?.image && roomConfig.roImage) {
    response.images = [roomConfig.roImage]
  }
  return response
}

const repeaters = {
  replies: [{
    text: 'row',
    image: false
  }, {
    text: 'row, row',
    image: false
  }, {
    text: 'row, row, row your boat gently down the stream 🚣‍♀️',
    image: true
  }]
}

export const clearRo = (slug) => {
  if (repeaters[slug]) {
    repeaters[slug].count = 0
    repeaters[slug].users = []
  }
}

const repeater = (slug, userId) => {
  if (!repeaters[slug]) {
    repeaters[slug] = {
      count: 0,
      users: []
    }
  }
  if (repeaters[slug].count >= repeaters.replies.length) return

  const userEntry = repeaters[slug].users.find(user => user.id === userId)
  if (userEntry) return

  const message = repeaters.replies[repeaters[slug].count].text
  const image = repeaters.replies[repeaters[slug].count].image
  repeaters[slug].users.push({ id: userId, timeStamp: Date.now() })
  repeaters[slug].count++
  return { message, image }
}
