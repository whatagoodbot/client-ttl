import { connect } from 'mqtt'
import { logger } from '../utils/logging.js'
import mqttTopicHandlers from '../messageHandlers/responses.js'

const mqttOptions = {
  port: process.env.MSTT_PORT,
  host: `mqtt://${process.env.MQTT_HOSTNAME}`,
  clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  keepalive: 60,
  reconnectPeriod: 1000,
  protocolId: 'MQIsdp',
  protocolVersion: 3,
  clean: true,
  encoding: 'utf8'
}

const topicPrefix = `${process.env.NODE_ENV}/responder/`

const client = connect(mqttOptions.host, mqttOptions)

client.on('connect', () => {
  Object.keys(mqttTopicHandlers).forEach((topic) => {
    client.subscribe(`${topicPrefix}${topic}`, (err) => {
      if (err) logger.error(err, 'err')
    })
  })
})

client.on('message', async (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString())
    mqttTopicHandlers[topic.substring(topicPrefix.length)](message)
  } catch (error) {
    logger.error(error.toString())
  }
})

export const publish = (topic, request) => {
  try {
    client.publish(`${topicPrefix}${topic}`, JSON.stringify(request))
  } catch (error) {
    client.publish(`${topicPrefix}${topic}`, JSON.stringify({ error: error.toString() }))
  }
}
