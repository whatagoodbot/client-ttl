import { Chain } from 'repeat'
import { Bot } from './libs/bot.js'
import { roomsDb } from './models/index.js'

const rooms = await roomsDb.getAll()
rooms.forEach(async room => {
  const roomBot = new Bot(room)
  await roomBot.connect(room)
  roomBot.configureListeners()
  const repeatedTasks = new Chain()
  repeatedTasks
    .add(() => roomBot.processNewMessages())
    .every(500)
})
