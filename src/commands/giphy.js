import { buildUrl, makeRequest } from '../utils/networking.js'
import { configDb, stringsDb } from '../models/index.js'

const configName = 'giphy'

export default async (options) => {
  const config = await configDb.get(configName)
  const searchParams = [
    ['api_key', config.apiKey],
    ['q', options.argument],
    ...config.searchParams
  ]

  const url = buildUrl(config.hostname, config.paths, searchParams)
  const response = await makeRequest(url)
  if (response?.data?.length > 0) {
    return { images: [response?.data[0]?.images?.original?.url] }
  }
  return { message: await stringsDb.get('noGiphy') }
}
