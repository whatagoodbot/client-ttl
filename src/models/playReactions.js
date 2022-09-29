import { stringsDb } from '../models/index.js'
import { getUser } from '../libs/ttlive.js'

const tableName = 'playReactions'
const tableNamePlays = 'userPlays'

export default (knex) => {
  return {
    add: async (play, reaction, reactionFrom) => {
      if (['dope', 'nope'].includes(reaction)) {
        const oppositeReactions = {
          dope: 'nope',
          nope: 'dope'
        }
        const alreadyTracked = await knex(tableName)
          .where({
            play,
            reactionFrom,
            reaction: oppositeReactions[reaction]
          })
          .first()
        if (alreadyTracked) {
          const results = await knex(tableName)
            .where({
              id: alreadyTracked.id
            })
            .update({
              reaction
            })
          if (results.length > 0) return true
          return false
        }
      }
      const results = await knex(tableName)
        .insert({
          play,
          reaction,
          reactionFrom
        })
        .onConflict().ignore()
      if (results.length > 0) return true
      return false
    },
    getPlayTotal: async (play) => {
      return await knex(tableName)
        .where({ play })
    },
    getRoomFavourite: async (options) => {
      const isAllTime = options.argument.includes('alltime')
      const currentDate = new Date()
      let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      if (isAllTime) {
        firstDayOfMonth = new Date('1970', '1', '1')
      }
      const results = await knex(tableName)
        .join(tableNamePlays, { 'playReactions.play': 'userPlays.id' })
        .whereBetween('playReactions.createdAt', [firstDayOfMonth, currentDate])
        .andWhere('userPlays.room', options.roomProfile.slug)
      const scores = {}
      results.forEach((result) => {
        scores[result.songId] = scores[result.songId] || { titleArtist: `${result.artist}: ${result.title}`, score: 0 }
        switch (result.reaction) {
          case 'star':
            scores[result.songId].score += 2
            break
          case 'dope':
            scores[result.songId].score++
            break
          case 'nope':
            scores[result.songId].score--
            break
        }
      })
      const table = Object.keys(scores).map((songId) => {
        return { titleArtist: scores[songId].titleArtist, score: scores[songId].score }
      })
      let orderedTable = table.sort((a, b) => {
        return b.score - a.score
      })
      orderedTable = orderedTable.shift()
      const stringKey = isAllTime ? 'roomFavouriteIntroForAllTime' : 'roomFavouriteIntro'
      return { message: `${await stringsDb.get(stringKey)} ${orderedTable.titleArtist}` }
    },
    getRoomReactions: async (options) => {
      const isAllTime = options.argument.includes('alltime')
      const currentDate = new Date()
      let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      if (isAllTime) {
        firstDayOfMonth = new Date('1970', '1', '1')
      }
      const results = await knex(tableName)
        .join(tableNamePlays, { 'playReactions.play': 'userPlays.id' })
        .whereBetween('playReactions.createdAt', [firstDayOfMonth, currentDate])
        .andWhere('userPlays.room', options.roomProfile.slug)
        .andWhere('playReactions.reaction', options.type)
      const stringKey = isAllTime ? 'getRoomReactionsForAllTime' : 'getRoomReactions'
      return { message: `${await stringsDb.get(stringKey)} ${results.length} ${options.type}s` }
    },
    getUserReactions: async (options) => {
      const isAllTime = options.argument.includes('alltime')
      const currentDate = new Date()
      let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      if (isAllTime) {
        firstDayOfMonth = new Date('1970', '1', '1')
      }
      const results = await knex(tableName)
        .join(tableNamePlays, { 'playReactions.play': 'userPlays.id' })
        .whereBetween('playReactions.createdAt', [firstDayOfMonth, currentDate])
        .andWhere('userPlays.user', options.sender)
        .andWhere('playReactions.reaction', options.type)
      const stringKey = isAllTime ? 'getUserReactionsForAllTime' : 'getUserReactions'
      return { message: `${await stringsDb.get(stringKey)} ${results.length} ${options.type}s` }
    },
    getReactionTable: async (options) => {
      const isAllTime = options?.argument?.includes('alltime')
      const currentDate = new Date()
      let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      if (isAllTime) {
        firstDayOfMonth = new Date('1970', '1', '1')
      }
      const results = await knex(tableName)
        .join(tableNamePlays, { 'playReactions.play': 'userPlays.id' })
        .whereBetween('playReactions.createdAt', [firstDayOfMonth, currentDate])
        .andWhere('userPlays.room', options.roomProfile.slug)
        .modify((queryBuilder) => {
          if (options.theme) {
            queryBuilder.where('userPlays.theme', options.theme)
          }
        })
      const scores = {}
      results.forEach((result) => {
        scores[result.user] = scores[result.user] || { score: 0 }
        switch (result.reaction) {
          case 'star':
            scores[result.user].score += 2
            break
          case 'dope':
            scores[result.user].score++
            break
          case 'nope':
            scores[result.user].score--
            break
        }
      })
      const table = Object.keys(scores).map((user) => {
        return { user, score: scores[user].score }
      })
      let orderedTable = table.sort((a, b) => {
        return b.score - a.score
      })
      orderedTable = orderedTable.slice(0, options.theme ? 1 : 5)
      const tableMessage = []
      let messageStart = '👑'
      let position = 0
      for (const record in orderedTable) {
        const userProfile = await getUser(orderedTable[record].user)
        const positionIcons = [
          '⓵',
          '⓶',
          '⓷',
          '⓸',
          '⓹'
        ]
        tableMessage.push(`${(!options.theme) ? positionIcons[position++] : ''} ${messageStart} ${userProfile.nickname} ${await stringsDb.get('reactionTableUserEntry')} ${orderedTable[record].score}`)
        messageStart = ''
      }
      const stringKey = isAllTime ? 'reactionTableIntroForAllTime' : 'reactionTableIntro'
      if (!tableMessage.length) return
      if (options.theme) {
        return `${await stringsDb.get('themeTableIntro')}${tableMessage.join('. ')}. `
      }
      return { message: `${await stringsDb.get(stringKey)} ${tableMessage.join('. ')}` }
    }
  }
}
