import { getRoom } from '../libs/ttlive.js'
import { stringsDb, configDb } from '../models/index.js'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { SpotifyClient } = require('../libs/spotify.cjs')

const spotify = new SpotifyClient(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET
)

const getAvailableMarkets = (trackId) => {
  return new Promise(resolve => {
    spotify.getTrack(trackId).then((track) => {
      resolve(track.available_markets)
    })
  })
}

export default async (options) => {
  let response = { message: await stringsDb.get('spotifyNoTrackFound') }
  const roomData = await getRoom(options.roomProfile.slug)
  let currentTrack = roomData?.song?.id
  if (currentTrack) {
    if (currentTrack.substring(0, 14) === 'spotify:track:') currentTrack = currentTrack.substring(14)
    const availableMarkets = await getAvailableMarkets(currentTrack)
    if (availableMarkets.length === 0) {
      return { message: await stringsDb.get('spotifyNoTrackInfo') }
    }
    const spotifyMarkets = await configDb.get('spotifyMarkets')
    const filteredMarkets = spotifyMarkets.filter(market => market.include)
    const differences = filteredMarkets.filter(market => !availableMarkets.includes(market.code))
    response = { message: await stringsDb.get('spotifyAvailableAll') }

    if (differences.length) {
      if (differences.length > availableMarkets.length) {
        const differencesPositive = filteredMarkets.filter(market => availableMarkets.includes(market.code))
        const availableRegions = differencesPositive.map((difference) => {
          return difference.name
        })
        response = { message: `${await stringsDb.get('spotifyAvailableIn')} ${availableRegions.join(', ')}` }
      } else {
        const unavailableRegions = differences.map((difference) => {
          return difference.name
        })
        response = { message: `${await stringsDb.get('spotifyNotAvailableIn')} ${unavailableRegions.join(', ')}` }
      }
    }
  }
  return response
}
