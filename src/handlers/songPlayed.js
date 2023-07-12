import { postMessage } from '../libs/cometchat.js'
import { getTrackFact } from '../libs/bard.js'

export default async (payload, room) => {
  if (payload?.song?.artistName?.toLowerCase().includes(process.env.FAVOURITE_ARTIST.toLowerCase())) {
    const reply = await getTrackFact(`${payload.song.trackName} by ${payload.song.artistName}`)
    await postMessage({
      room,
      message: 'Great song. Let me tell you a little about it!'
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
