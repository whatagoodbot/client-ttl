const tableName = 'quickThemes'

export default (knex) => {
  return {
    add: async (leader, caboose, room) => {
      return await knex(tableName)
        .insert({
          leader,
          caboose,
          room
        })
    },
    getCurrent: async (room) => {
      return await knex(tableName)
        .whereNull('end')
        .andWhere({ room })
        .first()
    },
    update: async (id, update) => {
      await knex(tableName)
        .where({ id })
        .update(update)
    }
  }
}
