import * as winston from 'winston'

const { format, createLogger, transports } = winston.default
const { timestamp, combine, errors, json } = format

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new transports.Console()
  ]
})
