import * as winston from 'winston'

const { createLogger, transports } = winston.default

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new transports.Console()
  ]
})
