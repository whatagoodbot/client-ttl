import { logger } from '../utils/logging.js'

export default payload => {
  logger.info(JSON.stringify(payload))
}
