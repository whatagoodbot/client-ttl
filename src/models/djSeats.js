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
    getNextAvailable: async (room) => {
      return await knex(tableName)
        .whereNull('user')
        .andWhere({ room })
        .orderBy('seat', 'ASC')
        .first()
    },
    update: async (query, values) => {
      return await knex(tableName)
        .where(query)
        .update(values)
    }
  }
}
