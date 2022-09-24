import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const Lastfm = require('simple-lastfm')

export const createLastfmInstance = async (lastfmOptions) => {
  const lastfm = new Lastfm(lastfmOptions)
  return new Promise(resolve => {
    lastfm.getSessionKey(() => {
      resolve(lastfm)
    })
  })
}

export const scrobbleTrack = async (lastfmInstance, artist, track) => {
  if (process.env.NODE_ENV === 'development') return
  const promises = [
    new Promise(resolve => {
      lastfmInstance.scrobbleTrack({
        artist,
        track,
        callback: (result) => {
          resolve(result)
        }
      })
    }),
    new Promise(resolve => {
      lastfmInstance.scrobbleNowPlayingTrack({
        artist,
        track,
        callback: (result) => {
          resolve(result)
        }
      })
    })
  ]
  return Promise.all(promises)
}
