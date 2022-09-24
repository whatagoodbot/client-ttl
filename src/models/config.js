export default (knex) => {
  return {
    get: async (name) => {
      const result = await knex('config')
        .where({ name })
        .first()

      if (result?.config) return JSON.parse(result.config)
    }
  }
}
