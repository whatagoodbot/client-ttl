const tableName = 'djSeats'

export default (knex) => {
  return {
    upsert: async (user, room, seat) => {
      return await knex(tableName)
        .insert({
          user,
          room,
          seat
        })
        .onConflict()
        .merge()
    },
    getAllByQuery: async (query) => {
      return await knex(tableName)
        .whereNotNull('user')
        .andWhere(query)
    },
    getOneByQuery: async (query) => {
      return await knex(tableName)
        .whereNotNull('user')
        .andWhere(query)
        .first()
    },
    update: async (query, values) => {
      return await knex(tableName)
        .where(query)
        .update(values)
    }
  }
}
