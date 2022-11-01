import { Bot } from './libs/bot.js'
import { roomsDb } from './models/index.js'

const rooms = await roomsDb.getAll()
rooms.forEach(async room => {
  const roomBot = new Bot(room)
  roomBot.configureListeners()
})
