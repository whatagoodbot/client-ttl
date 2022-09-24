export default (knex) => {
  return {
    get: async (name) => {
      const result = await knex('strings')
        .where({ name })
        .first()
      return result.value
    },
    getMany: async (names) => {
      const results = await knex('strings')
        .whereIn('name', names)
      const simplifiedResults = results.map((result) => {
        return [result.name, result.value]
      })
      return Object.fromEntries(simplifiedResults)
    }
  }
}
