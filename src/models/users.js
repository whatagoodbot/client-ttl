const tableName = 'users'

export default (knex) => {
  return {
    get: async (id) => {
      return await knex(tableName)
        .where({ id })
        .first()
    },
    getByName: async (name) => {
      return await knex(tableName)
        .where({ name })
        .first()
    },
    updateLastWelcomed: async (id, name) => {
      const existingUser = await knex(tableName)
        .where({ id })
        .first()
      if (existingUser) {
        await knex(tableName)
          .where({ id })
          .update({ lastWelcomed: new Date() })
      } else {
        await knex(tableName)
          .insert({
            id,
            name,
            lastWelcomed: new Date()
          })
      }
    },
    updateLastDisconnected: async (id) => {
      await knex(tableName)
        .where({ id })
        .update({ lastDisconnected: new Date() })
    }
  }
}
