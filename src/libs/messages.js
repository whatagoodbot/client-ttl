import { EventEmitter } from 'node:events'

import broker from 'message-broker'
import { logger } from '../utils/logging.js'
import { postMessage } from './cometchat.js'

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

if (broker.client.connected) {
  subscribe()
} else {
  broker.client.on('connect', subscribe)
}

broker.client.on('message', async (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString())
    if (message?.client !== process.env.npm_package_name) return
    if (topic === `${topicPrefix}broadcast`) {
      receiveBroadcast(message)
    } else if (topic === `${topicPrefix}externalRequest` && message.service === process.env.npm_package_name) {
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

const receiveBroadcast = async (data) => {
  const validatedBroadcastMessage = broker.broadcast.validate(data)
  if (validatedBroadcastMessage.errors) return
  // data.room.id = '9d2d87a4-a515-424f-ba27-11b9878c64eb' //good bot test
  data.room.id = '8fe23fc9-c002-4ff5-bc19-36cb03915f71' // nabs test
  postMessage(data)
}
export const publish = (topic, request) => {
  const validatedRequest = broker[topic].validate(request)
  if (validatedRequest.errors) console.log(validatedRequest.errors)
  broker.client.publish(`${topicPrefix}${topic}`, JSON.stringify(validatedRequest))
}
