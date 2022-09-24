const tableName = 'themes'

export default (knex) => {
  return {
    getAll: async () => {
      return await knex(tableName)
        .whereNull('used')
    },
    getById: async (id) => {
      return await knex(tableName)
        .where({ id })
        .first()
    },
    getByQuery: async (query) => {
      return await knex(tableName)
        .where(query)
    },
    update: async (id, key, value) => {
      return await knex(tableName)
        .where({ id })
        .update({ [key]: value })
    }
  }
}
