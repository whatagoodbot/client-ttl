import { EventEmitter } from 'node:events'

import broker from 'message-broker'
import { logger } from '../utils/logging.js'

const topicPrefix = `${process.env.NODE_ENV}/`

const subscribe = () => {
  ['broadcast', 'externalRequest'].forEach(topic => {
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

export const recievedCommand = new EventEmitter()
export const recievedMessage = new EventEmitter()

if (broker.client.connected) {
  subscribe()
} else {
  broker.client.on('connect', subscribe)
}

broker.client.on('message', async (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString())
    if (message?.client !== 'RVRB') return
    if (topic === `${topicPrefix}broadcast`) {
      recievedMessage.emit('externalMessage', message)
    } else if (topic === `${topicPrefix}externalRequest` && message.service === 'RVRB') {
      recievedCommand.emit('externalRequest', message)
    }
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
  const validatedRequest = broker[topic].validate(request)
  if (validatedRequest.errors) console.log(validatedRequest.errors)
  broker.client.publish(`${topicPrefix}${topic}`, JSON.stringify(validatedRequest))
}
