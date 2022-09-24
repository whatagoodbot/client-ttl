import { createRequire } from 'module'
import knexfile from '../../knexfile.js'

import usersModel from './users.js'
import roomsModel from './rooms.js'
import themesModel from './themes.js'
import configModel from './config.js'
import stringsModel from './strings.js'
import djSeatsModel from './djSeats.js'
import greetingModel from './greetings.js'
import responsesModel from './responses.js'
import userPlaysModel from './userPlays.js'
import quickThemesModel from './quickThemes.js'
import playReactionsModel from './playReactions.js'
import quickThemesTrackerModel from './quickThemesTracker.js'

const require = createRequire(import.meta.url)
const { knex } = require('../libs/knex.cjs')(knexfile[process.env.NODE_ENV])

export const usersDb = usersModel(knex)
export const roomsDb = roomsModel(knex)
export const themesDb = themesModel(knex)
export const configDb = configModel(knex)
export const stringsDb = stringsModel(knex)
export const djSeatsDb = djSeatsModel(knex)
export const greetingsDb = greetingModel(knex)
export const responsesDb = responsesModel(knex)
export const userPlaysDb = userPlaysModel(knex)
export const quickThemesDb = quickThemesModel(knex)
export const playReactionsDb = playReactionsModel(knex)
export const quickThemesTrackerDb = quickThemesTrackerModel(knex)
