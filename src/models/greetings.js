export default (knex) => {
  return {
    get: async (user) => {
      const tableName = 'greetings'
      let messageResults = await knex(tableName)
        .where({ user, type: 'text' })
      if (!messageResults.length) {
        messageResults = await knex(tableName)
          .where({ user: null })
      }
      const imageResults = await knex(tableName)
        .where({ user, type: 'image' })
      const messages = messageResults.map((message) => { return message.greeting })
      const images = imageResults.map((image) => { return image.greeting })
      if (images.length) return { messages, images }
      return { messages }
    },

    add: async (user, greeting, type) => {
      const tableName = 'greetings'
      const results = await knex(tableName)
        .insert({
          user,
          type,
          greeting
        })
      if (results.length > 0) return true
      return false
    }
  }
}
