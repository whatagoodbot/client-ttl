
export const up = (knex) => {
  return knex.schema
    .createTable('themes', function (table) {
      table.increments('id').notNullable().primary()
      table.string('name', 255)
      table.timestamp('used')
      table.timestamps(true, true, true)
    })
}

export const down = (knex) => {
  return knex.schema
    .dropTable('themes')
}
