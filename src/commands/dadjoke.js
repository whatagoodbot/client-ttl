import { buildUrl, makeRequest } from '../utils/networking.js'
import { stringsDb } from '../models/index.js'

export default async () => {
  const url = buildUrl('icanhazdadjoke.com')
  const response = await makeRequest(url)
  if (response.joke) return { message: response.joke }
  return { message: await stringsDb.get('noDadJoke') }
}
