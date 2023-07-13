import { postMessage } from '../libs/cometchat.js'
import { getTrackFact } from '../libs/ai.js'
let count = 0

export default async (payload, room) => {
  if (payload?.song?.artistName?.toLowerCase().includes(process.env.FAVOURITE_ARTIST.toLowerCase())) {
    const reply = await getTrackFact(`${payload.song.trackName} by ${payload.song.artistName}`)
    let messageSuffix = ''
    if (count++ > process.env.MERCH_MESSAGE_RANDOM_SONG_COUNT) {
      count = 0
      if (Math.floor(Math.random() * 2) === 1) {
        messageSuffix = process.env.MERCH_MESSAGE_RANDOM
      }
    }
    if (reply?.length > 0) {
      await postMessage({
        room,
        message: `Great song. Let me tell you a little about it! ${messageSuffix}`
      })
      const responses = reply.split('\n')
      for (const item in responses) {
        const response = responses[item].trim()
        if (response.length > 0) {
          await postMessage({
            room,
            message: response
          })
        }
      }
    }
  }
}
