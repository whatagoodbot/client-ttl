import * as winston from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'

const elasticSearchTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: 'http://192.168.4.56:9200'
  }
})

export let logger = null

const { format, createLogger, transports } = winston.default
const { timestamp, combine, errors, json } = format

function buildDevLogger () {
  return createLogger({
    transports: [
      elasticSearchTransport,
      new transports.Console()
    ]
  })
}

function buildProdLogger () {
  return createLogger({
    format: combine(timestamp(), errors({ stack: true }), json()),
    defaultMeta: { service: 'tasks-backend' },
    transports: [new transports.Console()]
  })
}

if (process.env.NODE_ENV === 'development') {
  logger = buildDevLogger()
  logger.info('Logging in development mode', { env: 'Development' })
} else {
  logger = buildProdLogger()
  logger.info('Logging in production mode')
}
