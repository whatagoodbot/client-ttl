import { buildUrl, makeRequest } from '../utils/networking.js'
import { configDb } from '../models/index.js'
const configName = 'ttlive'

const getHeaders = (config) => {
  return {
    authorization: 'Bearer ' + config.token,
    dnt: 1,
    origin: 'https://tt.live',
    referer: 'https://tt.live/'
  }
}

export const getUser = async (userId) => {
  const config = await configDb.get(configName)
  const paths = [
    'profile',
    userId
  ]
  const headers = getHeaders(config)
  headers.authority = config.userHost

  const url = buildUrl(config.userHost, paths)
  const response = await makeRequest(url, { headers })
  return response
}

export const getRoom = async (slug) => {
  const config = await configDb.get(configName)
  const paths = [
    'rooms',
    slug
  ]
  const headers = getHeaders(config)
  headers.authority = config.roomHost

  const url = buildUrl(config.roomHost, paths)
  const response = await makeRequest(url, { headers })
  return response
}

export const pinMessage = async (slug, message) => {
  const chatConfig = await configDb.get('cometchat')
  const config = await configDb.get(configName)
  const paths = [
    'rooms',
    slug,
    'pinned-messages'
  ]
  const headers = getHeaders(config)
  headers.authority = config.roomHost
  let body = { pinnedMessages: [] }
  if (message) {
    body = {
      pinnedMessages: [{
        message: {
          message,
          userName: chatConfig.avatar.name,
          avatarId: chatConfig.avatar.id,
          color: chatConfig.avatar.colour,
          userUuid: chatConfig.botId,
          date: new Date(),
          retryButton: false,
          reactions: {},
          pinnedByName: chatConfig.avatar.name,
          pinnedByUUID: chatConfig.botId
        }
      }]
    }
  }
  const url = buildUrl(config.roomHost, paths)
  const response = await makeRequest(url, { method: 'POST', body: JSON.stringify(body) }, headers)
  return response
}
