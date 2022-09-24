
export const up = (knex) => {
  return knex.schema
    .createTable('djSeats', function (table) {
      table.string('user', 255)
      table.string('room', 255)
      table.integer('seat')
      table.timestamps(true, true, true)
      table.primary(['room', 'seat'])
    })
}

export const down = (knex) => {
  return knex.schema
    .dropTable('djSeats')
}
