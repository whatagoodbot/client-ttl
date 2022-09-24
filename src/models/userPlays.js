import { stringsDb } from '../models/index.js'
const tableName = 'userPlays'

export default (knex) => {
  return {
    add: async (user, room, artist, title, songId, provider, theme = null) => {
      const results = await knex(tableName)
        .insert({
          user,
          room,
          artist,
          title,
          songId,
          provider,
          theme
        })
      if (results.length > 0) return true
      return false
    },
    getPlays: async (options) => {
      const isAllTime = options.argument.includes('alltime')
      const queryKey = options.getPlaysForKey
      const currentDate = new Date()
      let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      if (isAllTime) {
        firstDayOfMonth = new Date('1970', '1', '1')
      }
      const stringKey = `spinsIntro${queryKey.charAt(0).toUpperCase() + queryKey.slice(1)}${isAllTime ? 'ForAllTime' : ''}`
      const results = await knex(tableName)
        .whereBetween('createdAt', [firstDayOfMonth, currentDate])
        .andWhere({ [queryKey]: `${options.getPlaysForValue}` })
      return { message: `${await stringsDb.get(stringKey)} ${results.length} ${await stringsDb.get('spinsOutro')}` }
    },
    getLast: async (user) => {
      return await knex(tableName)
        .where({ user })
        .orderBy('createdAt', 'desc')
        .first()
    },
    getCurrent: async (room) => {
      return await knex(tableName)
        .where({ room })
        .orderBy('createdAt', 'desc')
        .first()
    }
  }
}
