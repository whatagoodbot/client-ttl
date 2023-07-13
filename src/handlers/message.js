import { postMessage } from '../libs/cometchat.js'
import { askQuestion } from '../libs/ai.js'
import { logger } from '../utils/logging.js'

export default async payload => {
  logger.info({ sender: payload.senderName, message: payload.message })
  if (payload.message.includes(`@${process.env.CHAT_NAME}`)) {
    const keywords = process.env.MERCH_RESPONSE_KEYWORDS.split(',')
    for (const keyword in keywords) {
      if (payload.message.includes(keywords[keyword])) {
        return await postMessage({
          room: payload.room,
          message: process.env.MERCH_MESSAGE
        })
      }
    }
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
