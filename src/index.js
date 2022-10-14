import { connectToRoom } from './libs/rooms.js'
import { roomsDb } from './models/index.js'

const rooms = await roomsDb.getAll()
rooms.forEach(room => connectToRoom(room))
