import { createRequire } from 'module'
import knexfile from '../../knexfile.js'

import roomsModel from './rooms.js'
// import themesModel from './themes.js'
import configModel from './config.js'
// import djSeatsModel from './djSeats.js'
// import userPlaysModel from './userPlays.js'
// import quickThemesModel from './quickThemes.js'
// import playReactionsModel from './playReactions.js'
// import quickThemesTrackerModel from './quickThemesTracker.js'

const require = createRequire(import.meta.url)
const { knex } = require('../libs/knex.cjs')(knexfile[process.env.NODE_ENV])

export const roomsDb = roomsModel(knex)
// export const themesDb = themesModel(knex)
export const configDb = configModel(knex)
// export const djSeatsDb = djSeatsModel(knex)
// export const userPlaysDb = userPlaysModel(knex)
// export const quickThemesDb = quickThemesModel(knex)
// export const playReactionsDb = playReactionsModel(knex)
// export const quickThemesTrackerDb = quickThemesTrackerModel(knex)
