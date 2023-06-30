import { buildUrl, makeRequest } from '../utils/networking.js'

const userHost = 'api.prod.tt.fm'
const roomHost = 'rooms.prod.tt.fm'

const getHeaders = () => {
  return {
    authorization: 'Bearer ' + process.env.TTL_USER_TOKEN,
    dnt: 1,
    origin: 'https://tt.live',
    referer: 'https://tt.live/'
  }
}

export const getTTUser = async (userId) => {
  const paths = [
    'profile',
    userId
  ]
  const headers = getHeaders()
  headers.authority = userHost

  const url = buildUrl(userHost, paths)
  const response = await makeRequest(url, { headers })
  return response
}

export const getRoom = async (slug) => {
  const paths = [
    'rooms',
    slug
  ]
  const headers = getHeaders()
  headers.authority = roomHost

  const url = buildUrl(roomHost, paths)
  const response = await makeRequest(url, { headers })
  return response
}

export const pinMessage = async (slug, message) => {
  const paths = [
    'rooms',
    slug,
    'pinned-messages'
  ]
  const headers = getHeaders()
  headers.authority = roomHost
  let body = { pinnedMessages: [] }
  if (message) {
    body = {
      pinnedMessages: [{
        message: {
          message,
          userName: process.env.CHAT_NAME,
          avatarId: process.env.CHAT_AVATAR_ID,
          color: `#${process.env.CHAT_COLOUR}`,
          userUuid: process.env.CHAT_USER_ID,
          date: new Date(),
          retryButton: false,
          reactions: {},
          pinnedByName: process.env.CHAT_NAME,
          pinnedByUUID: process.env.CHAT_USER_ID
        }
      }]
    }
  }
  const url = buildUrl(roomHost, paths)
  const response = await makeRequest(url, { method: 'POST', body: JSON.stringify(body) }, headers)
  return response
}

export const joinRoom = async slug => {
  const paths = [
    'rooms',
    slug,
    'join'
  ]
  const headers = getHeaders()
  headers.authority = roomHost

  const url = buildUrl(roomHost, paths)
  return await makeRequest(url, { headers, method: 'POST' })
}

export const joinChatRoom = async roomId => {
  const paths = [
    'roomUserRoles',
    'cometchat',
    'join',
    roomId
  ]
  const headers = getHeaders()
  headers.authority = roomHost

  const url = buildUrl(roomHost, paths)
  return await makeRequest(url, { headers, method: 'POST' })
}
