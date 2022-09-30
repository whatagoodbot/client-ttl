import { buildUrl } from '../utils/networking.js'
import { stringsDb } from '../models/index.js'

export default async (options) => {
  if (!options.argument) return { message: await stringsDb.get('noCity') }
  const args = options.argument.map(arg => {
    return arg.replaceAll(/,/gi, '').replaceAll(/ /gi, '')
  }).filter(arg => {
    return arg.length > 0
  })
  const url = buildUrl('wttr.in', [`${args.join(',')}_q0np.png`]).href
  return { images: [url] }
}
