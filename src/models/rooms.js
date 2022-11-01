export default (knex) => {
  return {
    get: async (slug) => {
      return await knex('rooms')
        .where({ slug })
        .first()
    },
    getAll: async () => {
      return await knex('rooms')
        .where({ enabled: true })
    }
  }
}
