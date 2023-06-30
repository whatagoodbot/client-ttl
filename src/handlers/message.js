import { postMessage } from '../libs/cometchat.js'
import { askQuestion } from '../libs/bard.js'

export default async payload => {
  if (payload.message.includes(`@${process.env.CHAT_NAME}`)) {
    const reply = await askQuestion(payload.message.replace(`@${process.env.CHAT_NAME}`, ''), payload.room)
    const responses = reply.split('\n')
    for (const item in responses) {
      const response = responses[item].trim()
      if (response.length > 0) {
        await postMessage({
          room: payload.room,
          message: response
        })
      }
    }
  }
}