import { createRequire } from 'module'
import { configDb } from '../models/index.js'

const config = await configDb.get('cometchat')

const require = createRequire(import.meta.url)
const { SpotifyClient } = require('../libs/spotify.cjs')

const spotify = new SpotifyClient(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET
)

export const djInRooms = {}
export let botDjSongs

const getPlaylist = (playlistId) => {
  return new Promise(resolve => {
    spotify.getPlaylist(playlistId).then((playlist) => {
      resolve(playlist)
    })
  })
}

const getSongsFromPlaylist = async (playlist) => {
  if (!playlist) {
    return
  }
  botDjSongs = playlist.items.map((item) => {
    const song = {
      artistName: item.track.artists[0].name,
      duration: Math.floor(item.track.duration_ms / 1000),
      genre: '',
      id: 'spotify:track:' + item.track.id,
      isrc: item.track.external_ids.isrc,
      musicProvider: 'spotify',
      trackName: item.track.name,
      trackUrl: ''
    }
    return song
  })
  return botDjSongs
}

export const up = async (options) => {
  await getSongsFromPlaylist(await getPlaylist(process.env.SPOTIFY_DJ_PLAYLIST))
  djInRooms[options.roomProfile.slug] = true
  options.socket.emit('takeDjSeat', {
    avatarId: config.avatar.id,
    djSeatKey: 0,
    nextTrack: { song: botDjSongs[Math.floor(Math.random() * botDjSongs.length)] },
    userUuid: config.botId,
    isBot: true
  })
}

export const down = async (options) => {
  djInRooms[options.roomProfile.slug] = false
  options.socket.emit('leaveDjSeat', {
    userUuid: config.botId
  })
}
