
export const up = (knex) => {
  return knex.schema
    .createTable('rooms', function (table) {
      table.string('slug', 255).notNullable().primary()
      table.string('name', 255)
      table.string('roImage', 255)
      table.json('lastfm')
      table.timestamps(true, true, true)
    })
    .createTable('users', function (table) {
      table.string('id', 255).notNullable().primary()
      table.string('name', 255)
      table.timestamp('lastWelcomed')
      table.timestamp('lastDisconnected')
      table.timestamps(true, true, true)
    })
    .createTable('greetings', function (table) {
      table.increments('id').notNullable().primary()
      table.string('greeting', 255).notNullable()
      table.enu('type', ['image', 'text']).notNullable()
      table.string('user', 255)
      table.timestamps(true, true, true)
    })
    .createTable('config', function (table) {
      table.string('name', 255).notNullable().primary()
      table.json('config')
      table.timestamps(true, true, true)
    })
    .createTable('responses', function (table) {
      table.increments('id').notNullable().primary()
      table.string('name', 255).notNullable()
      table.string('room', 255).notNullable()
      table.enu('type', ['image', 'text']).notNullable()
      table.string('value', 1000).notNullable()
      table.timestamps(true, true, true)
    })
    .createTable('strings', function (table) {
      table.string('name', 255).notNullable().primary()
      table.string('value', 255).notNullable()
      table.timestamps(true, true, true)
    })
    .createTable('userPlays', function (table) {
      table.increments('id').notNullable().primary()
      table.string('songId', 255).notNullable()
      table.string('user', 255).notNullable()
      table.string('provider', 255)
      table.string('room', 255).notNullable()
      table.string('artist', 255).notNullable()
      table.string('title', 255).notNullable()
      table.integer('theme')
      table.timestamps(true, true, true)
    })
    .createTable('playReactions', function (table) {
      table.increments('id').notNullable().primary()
      table.integer('play').notNullable()
      table.enu('reaction', ['dope', 'nope', 'star']).notNullable()
      table.string('reactionFrom', 255)
      table.timestamps(true, true, true)
    })
}

export const down = (knex) => {
  return knex.schema
    .dropTable('rooms')
    .dropTable('users')
    .dropTable('greetings')
    .dropTable('config')
    .dropTable('responses')
    .dropTable('strings')
    .dropTable('userPlays')
    .dropTable('playReactions')
}
