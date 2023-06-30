import { v4 as uuidv4 } from 'uuid'
import { buildUrl, makeRequest } from '../utils/networking.js'

const startTimeStamp = Math.floor(Date.now() / 1000)

const headers = {
  appid: process.env.CHAT_API_KEY,
  authtoken: process.env.CHAT_TOKEN,
  dnt: 1,
  origin: 'https://tt.live',
  referer: 'https://tt.live/',
  sdk: 'javascript@3.0.10'
}

export const joinChat = async (roomId) => {
  headers.appid = process.env.CHAT_API_KEY
  const paths = [
    'v3.0',
    'groups',
    roomId,
    'members'
  ]

  const url = buildUrl(`${process.env.CHAT_API_KEY}.apiclient-us.cometchat.io`, paths)
  const response = await makeRequest(url, { headers, method: 'POST' })
  return response
}

export const postMessage = async (options) => {
  headers.appid = process.env.CHAT_API_KEY
  const paths = [
    'v3.0',
    'messages'
  ]

  const customData = {
    message: options.message || '',
    avatarId: process.env.CHAT_AVATAR_ID,
    userName: process.env.CHAT_NAME,
    color: `#${process.env.CHAT_COLOUR}`,
    mentions: [],
    userUuid: process.env.CHAT_USER_ID,
    badges: ['VERIFIED', 'STAFF'],
    id: uuidv4()
  }
  if (options.images) customData.imageUrls = options.images

  if (options.mentions) {
    customData.mentions = options.mentions.map(mention => {
      return {
        start: mention.position,
        userNickname: mention.nickname,
        userUuid: mention.userId
      }
    })
  }

  const payload = {
    type: 'ChatMessage',
    receiverType: 'group',
    category: 'custom',
    data: {
      customData,
      metadata: {
        incrementUnreadCount: false
      }
    },
    metadata: {
      incrementUnreadCount: false
    },
    receiver: options.room.id
  }
  const url = buildUrl(`${process.env.CHAT_API_KEY}.apiclient-us.cometchat.io`, paths)
  const messageResponse = await makeRequest(url, { method: 'POST', body: JSON.stringify(payload) }, headers)
  return {
    message: options.message,
    messageResponse
  }
}

export const getMessages = async (roomId, fromTimestamp = startTimeStamp) => {
  headers.appid = process.env.CHAT_API_KEY
  const messageLimit = 50
  const paths = [
    'v3.0',
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
  const url = buildUrl(`${process.env.CHAT_API_KEY}.apiclient-us.cometchat.io`, paths, searchParams)
  return await makeRequest(url, { headers })
}
