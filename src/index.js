import { Chain } from 'repeat'
import { Bot } from './libs/bot.js'

const roomBot = new Bot(process.env.JOIN_ROOM)
await roomBot.connect()
roomBot.configureListeners()
const repeatedTasks = new Chain()
repeatedTasks
  .add(() => roomBot.processNewMessages())
  .every(500)
