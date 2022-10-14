import broker from 'message-broker'
import { logger } from '../utils/logging.js'
import { postMessage } from './cometchat.js'

const topicPrefix = `${process.env.NODE_ENV}/`
const topic = 'broadcast'

const subscribe = () => {
  broker.client.subscribe(`${topicPrefix}${topic}`, (err) => {
    logger.info(`subscribed to ${topicPrefix}${topic}`)
    if (err) {
      logger.error({
        error: err.toString(),
        topic
      })
    }
  })
}

if (broker.client.connected) {
  subscribe()
} else {
  broker.client.on('connect', subscribe)
}

broker.client.on('message', async (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString())
    if (message?.meta?.client === 'TTL') receiveBroadcast(message)
  } catch (error) {
    logger.error(error.toString())
  }
})

broker.client.on('error', (err) => {
  logger.error({
    error: err.toString()
  })
})

const receiveBroadcast = async (data) => {
  const validatedBroadcastMessage = broker.broadcast.validate(data)
  if (validatedBroadcastMessage.errors) return
  const newObject = { roomId: data.meta.roomUuid, ...data.response }
  postMessage(newObject)
}
export const publish = (topic, request, room, userId, nickname) => {
  try {
    if (!request.meta) return
    request.meta.client = 'TTL'
    const validatedRequest = broker[topic].validate(request)
    if (validatedRequest.errors) throw { message: validatedRequest.errors } // eslint-disable-line
    console.log(`Publishing ${topicPrefix}${topic}`)
    broker.client.publish(`${topicPrefix}${topic}`, JSON.stringify(validatedRequest))
  } catch (error) {
    // what should we do here?
    // broker.client.publish(`${topicPrefix}${topic}`, JSON.stringify({ error: error.toString() }))
  }
}
