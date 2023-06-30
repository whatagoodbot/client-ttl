import { Chain } from 'repeat'
import { Bot } from './libs/bot.js'

const roomBot = new Bot('nabstest')
await roomBot.connect()
roomBot.configureListeners()
const repeatedTasks = new Chain()
repeatedTasks
  .add(() => roomBot.processNewMessages())
  .every(500)
