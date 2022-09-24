import search from 'youtube-search'
import { getRoom } from '../libs/ttlive.js'
import { stringsDb } from '../models/index.js'

const performSearch = async (artist, song) => {
  if (!artist || !song) return { message: await stringsDb.get('youtubeNotFound') }
  return new Promise(resolve => {
    search(`${song} by ${artist}`, { maxResults: 1, key: process.env.YOUTUBE_API_KEY }, async (err, results) => {
      if (err) resolve({ message: await stringsDb.get('youtubeNotFound') })
      const reply = { message: results[0].link }
      if (results[0].thumbnails.medium.url) reply.images = [results[0].thumbnails.medium.url]
      resolve(reply)
    })
  })
}
export default async (options) => {
  const roomData = await getRoom(options.roomProfile.slug)
  const message = await performSearch(roomData?.song?.artistName, roomData?.song?.trackName)
  return message
}
