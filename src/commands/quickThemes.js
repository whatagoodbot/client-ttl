import { stringsDb } from '../models/index.js'
import { start, stop, get, isQuickThemeInProgress } from '../libs/quickThemes.js'

export const quicktheme = async (options) => {
  if (options.argument[0] === 'start') {
    const quickThemeInProgress = await isQuickThemeInProgress(options.roomProfile.slug)
    if (quickThemeInProgress) return { message: await stringsDb.get('themeAlreadyInProgress') }
    // Check if already started
    const startQuickTheme = await start(options.roomProfile.slug)
    if (startQuickTheme.started) {
      const strings = await stringsDb.getMany([
        'themeCurrent',
        'themeLeader',
        'themeCaboose',
        'themeOnDeck'
      ])
      return {
        messages: [
          `${strings.themeCurrent} ${startQuickTheme.theme.name}. ${strings.themeOnDeck} ${startQuickTheme.themeOnDeck.name}`,
          `${strings.themeLeader}${startQuickTheme.themeLeader.nickname}, ${strings.themeCaboose}${startQuickTheme.themeCaboose.nickname}`
        ]
      }
    } else {
      return { message: `${await stringsDb.get(startQuickTheme.reason)}` }
    }
  } else if (options.argument[0] === 'stop') {
    const quickThemeInProgress = await get(options.roomProfile.slug)
    if (!quickThemeInProgress) return { message: await stringsDb.get('themeNone') }
    stop(options.roomProfile.slug)
    return { message: `${await stringsDb.get('themeFinished')}` }
  } else if (options.argument[0] === 'current') {
    const quickThemeInProgress = await get(options.roomProfile.slug)
    if (!quickThemeInProgress) return { message: await stringsDb.get('themeNone') }
    const strings = await stringsDb.getMany([
      'themeCurrent',
      'themeLeader',
      'themeCaboose',
      'themeOnDeck'
    ])
    return {
      messages: [
        `${strings.themeCurrent} ${quickThemeInProgress.quickThemeTracker.currentThemeName}. ${strings.themeOnDeck} ${quickThemeInProgress.quickThemeTracker.nextThemeName}`,
        `${strings.themeLeader}${quickThemeInProgress.themeLeader.nickname}, ${strings.themeCaboose}${quickThemeInProgress.themeCaboose.nickname}`
      ]
    }
  }
  return { message: `${await stringsDb.get('themeUsage')}` }
}
