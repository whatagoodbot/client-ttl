
export const up = (knex) => {
  return knex.schema
    .createTable('quickThemes', function (table) {
      table.increments('id').primary()
      table.timestamp('start')
      table.timestamp('end')
      table.string('room', 255)
      table.string('leader', 255)
      table.string('caboose', 255)
      table.timestamps(true, true, true)
    })
    .createTable('quickThemesTracker', function (table) {
      table.increments('id').primary()
      table.integer('quickTheme')
      table.integer('currentTheme')
      table.integer('nextTheme')
      table.timestamps(true, true, true)
    })
}

export const down = (knex) => {
  return knex.schema
    .dropTable('quickThemes')
    .dropTable('quickThemeTracker')
}
