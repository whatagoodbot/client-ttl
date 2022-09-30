import broker from 'message-broker'
import { logger } from '../utils/logging.js'
import messageHandlers from '../messageHandlers/responses.js'

const topicPrefix = `${process.env.NODE_ENV}/responder/`

const subscribe = () => {
  Object.keys(messageHandlers).forEach((topic) => {
    broker.client.subscribe(`${topicPrefix}${topic}`, (err) => {
      logger.info(`subscribed to ${topicPrefix}${topic}`)
      if (err) {
        logger.error({
          error: err.toString(),
          topic
        })
      }
    })
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
    messageHandlers[topic.substring(topicPrefix.length)](message)
  } catch (error) {
    logger.error(error.toString())
  }
})

broker.client.on('error', (err) => {
  logger.error({
    error: err.toString()
  })
})

export const publish = (topic, request) => {
  try {
    broker.client.publish(`${topicPrefix}${topic}`, JSON.stringify(request))
  } catch (error) {
    // what should we do here?
    // broker.client.publish(`${topicPrefix}${topic}`, JSON.stringify({ error: error.toString() }))
  }
}
