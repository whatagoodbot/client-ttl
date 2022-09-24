import { connectToRoom } from './libs/rooms.js'
import { createLastfmInstance } from './libs/lastfm.js'
import { roomsDb } from './models/index.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

console.log(`Running version ${packageJson.version}`)

const defaultLastfmInstance = await createLastfmInstance({
  api_key: process.env.LASTFM_API_KEY,
  api_secret: process.env.LASTFM_API_SECRET,
  username: process.env.LASTFM_USERNAME,
  password: process.env.LASTFM_PASSWORD
})

const rooms = await roomsDb.getAll()
rooms.forEach(room => connectToRoom(room, defaultLastfmInstance))
