import { v4 as uuidv4 } from 'uuid'
import { buildUrl, makeRequest } from '../utils/networking.js'
import { configDb } from '../models/index.js'

const config = await configDb.get('cometchat')
const startTimeStamp = Math.floor(Date.now() / 1000)

const headers = {
  appid: config.apiKey,
  authtoken: config.chatAuthToken,
  dnt: 1,
  origin: 'https://tt.live',
  referer: 'https://tt.live/',
  sdk: 'javascript@3.0.10'
}

export const joinRoom = async (roomId) => {
  headers.appid = config.apiKey
  const paths = [
    config.version,
    'groups',
    roomId,
    'members'
  ]

  const url = buildUrl(`${config.apiKey}.apiclient-${config.region}.${config.hostname}`, paths)
  const response = await makeRequest(url, { headers, method: 'POST' })
  return response
}

export const postMessage = async (options) => {
  headers.appid = config.apiKey
  const paths = [
    config.version,
    'messages'
  ]

  const customData = {
    message: options.message || '',
    avatarId: config.avatar.id,
    userName: config.avatar.name,
    color: config.avatar.colour,
    userUuid: uuidv4(),
    badges: ['JQBX'],
    id: uuidv4()
  }
  // Nasty, yes. But backwards compatibility until all moved over to new format
  if (options.images || options.image) {
    customData.imageUrls = options.images || [options.image]
  }

  if (options.mentions) {
    customData.mentions = options.mentions
  }

  const payload = {
    type: 'ChatMessage',
    receiverType: 'group',
    category: 'custom',
    // customData,
    data: {
      customData,
      metadata: {
        incrementUnreadCount: true
      }
    },
    metadata: {
      incrementUnreadCount: true
    },
    receiver: options.roomId
  }
  if (process.env.NO_OUTPUT === 'true') return
  const url = buildUrl(`${config.apiKey}.apiclient-${config.region}.${config.hostname}`, paths)
  const messageResponse = await makeRequest(url, { method: 'POST', body: JSON.stringify(payload) }, headers)
  return {
    message: options.message,
    messageResponse
  }
}

export const getMessages = async (roomId, fromTimestamp = startTimeStamp) => {
  headers.appid = config.apiKey
  const messageLimit = 50
  const paths = [
    config.version,
    'groups',
    roomId,
    'messages'
  ]
  const searchParams = [
    ['per_page', messageLimit],
    ['hideMessagesFromBlockedUsers', 0],
    ['unread', 0],
    ['types', 'ChatMessage'],
    ['withTags', 0],
    ['hideDeleted', 0],
    ['sentAt', fromTimestamp],
    ['affix', 'append']
  ]
  const url = buildUrl(`${config.apiKey}.apiclient-${config.region}.${config.hostname}`, paths, searchParams)
  const messages = await makeRequest(url, { headers })
  return messages
}
