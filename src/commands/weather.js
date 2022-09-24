import { buildUrl } from '../utils/networking.js'
import { stringsDb } from '../models/index.js'

export default async (options) => {
  if (!options.argument) return { message: await stringsDb.get('noCity') }
  const url = buildUrl('wttr.in', [`${options.argument}_q0np.png`]).href
  return { images: [url] }
}
