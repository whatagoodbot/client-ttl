import { getRandomFromArray } from '../utils/getRandom.js'
import { Configuration, OpenAIApi } from 'openai'
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

export const gptGet = async (systemContent, userContent) => {
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: systemContent
    }, {
      role: 'user',
      content: userContent
    }]
  })
  if (response?.data?.choices?.length < 1) throw new Error('No Results')

  const replacables = [{
    original: 'an artificial intelligence language model',
    replacement: 'just your bot'
  }, {
    original: 'an AI language model',
    replacement: 'just your bot'
  }]

  let reply = getRandomFromArray(response.data.choices).message.content.trim()
  replacables.forEach(replacable => {
    reply = reply.replaceAll(replacable.original, replacable.replacement)
  })

  return reply
}
