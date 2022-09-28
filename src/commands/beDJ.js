import { createRequire } from 'module'
import { configDb } from '../models/index.js'

const config = await configDb.get('cometchat')

const require = createRequire(import.meta.url)
const { SpotifyClient } = require('../libs/spotify.cjs')

const spotify = new SpotifyClient(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET
)

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
  const songs = playlist.items.map((item) => {
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
  return songs
}

export const up = async (options) => {
  const songs = await getSongsFromPlaylist(await getPlaylist(process.env.SPOTIFY_DJ_PLAYLIST))
  options.socket.emit('takeDjSeat', {
    avatarId: config.avatar.id,
    djSeatKey: 0,
    nextTrack: { song: songs[Math.floor(Math.random() * songs.length)] },
    userUuid: config.botId,
    isBot: true
  })
}

export const down = async (options) => {
  options.socket.emit('leaveDjSeat', {
    userUuid: config.botId
  })
}
