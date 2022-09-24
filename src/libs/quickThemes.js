import { themesDb, djSeatsDb, quickThemesDb, quickThemesTrackerDb, stringsDb, playReactionsDb } from '../models/index.js'
import { getUser, pinMessage } from '../libs/ttlive.js'

export const isQuickThemeInProgress = async (room) => {
  return await quickThemesDb.getCurrent(room)
}

export const start = async (room) => {
  const isThemeInProgress = await get(room)
  if (isThemeInProgress) return { started: false, reason: 'themeAlreadyInProgress' }
  const seats = await djSeatsDb.getAllByQuery({ room })
  if (seats.length < 3) {
    return { started: false, reason: 'themeNotEnoughPeople' }
  }

  const themes = await themesDb.getAll()
  const theme = themes[Math.floor(Math.random() * themes.length)]
  const themeOnDeck = themes[Math.floor(Math.random() * themes.length)]

  const themeLeader = await getUser(seats[0].user)
  const themeCaboose = await getUser(seats[seats.length - 1].user)

  const themeRecord = await quickThemesDb.add(seats[0].user, seats[seats.length - 1].user, room)
  quickThemesTrackerDb.add(themeRecord[0], theme.id, themeOnDeck.id)

  return {
    started: true,
    theme,
    themeOnDeck,
    themeLeader,
    themeCaboose
  }
}

export const stop = async (room) => {
  const quickThemeInProgress = await isQuickThemeInProgress(room)
  if (quickThemeInProgress) {
    const quickThemeTracker = await quickThemesTrackerDb.get(quickThemeInProgress.id)
    quickThemesDb.update(quickThemeInProgress.id, { end: new Date() })
    themesDb.update(quickThemeTracker.currentTheme, 'used', new Date())
  }
  await pinMessage(room)
}

export const get = async (room) => {
  const quickThemes = await isQuickThemeInProgress(room)
  if (quickThemes?.id) {
    const quickThemeTracker = await quickThemesTrackerDb.get(quickThemes.id)
    const themeLeader = await getUser(quickThemes.leader)
    const themeCaboose = await getUser(quickThemes.caboose)

    return {
      quickThemes,
      quickThemeTracker,
      themeLeader,
      themeCaboose
    }
  }
}

export const progress = async (theme, user, room) => {
  const strings = await stringsDb.getMany([
    'themeCurrent',
    'themeLeader',
    'themeCaboose',
    'themeOnDeck',
    'themeNext',
    'themeNextLeader',
    'themeNextCaboose'
  ])
  if (user === theme.quickThemes.leader) {
    await pinMessage(room, `${strings.themeCurrent} ${theme.quickThemeTracker.currentThemeName}. ${strings.themeOnDeck} ${theme.quickThemeTracker.nextThemeName}`)
    if (theme.quickThemes.start) {
      const winner = await playReactionsDb.getReactionTable({
        theme: theme.quickThemeTracker.lastTheme
      })
      return [winner]
    } else {
      await quickThemesDb.update(theme.quickThemes.id, { start: new Date() })
      return [`${theme.quickThemeTracker.currentThemeName} ${await stringsDb.get('themeAGoGo')}`]
    }
  }
  if (user === theme.quickThemes.caboose) {
    themesDb.update(theme.quickThemeTracker.currentTheme, 'used', new Date())
    const themes = await themesDb.getAll()
    const themeOnDeck = themes[Math.floor(Math.random() * themes.length)]
    quickThemesTrackerDb.add(theme.quickThemes.id, theme.quickThemeTracker.nextTheme, themeOnDeck.id, theme.quickThemeTracker.currentTheme)
    const themeLeader = await getUser(theme.quickThemes.leader)
    const themeCaboose = await getUser(theme.quickThemes.caboose)
    return [
      `${strings.themeNext} ${theme.quickThemeTracker.nextThemeName}. ${strings.themeOnDeck} ${themeOnDeck.name}`,
      `${strings.themeNextLeader}${themeLeader.nickname}, ${strings.themeNextCaboose}${themeCaboose.nickname}`
    ]
  }
}

export const changeSeats = async (room) => {
  const inProgressTheme = await get(room)
  if (inProgressTheme) {
    const seats = await djSeatsDb.getAllByQuery({ room })
    if (seats.length < 3) {
      stop(room)
      return await stringsDb.get('themeStopNotEnoughPeople')
    }
    const themeLeaderId = seats[0].user
    const themeCabooseId = seats[seats.length - 1].user
    const themeLeaderProfile = await getUser(themeLeaderId)
    const themeCabooseProfile = await getUser(themeCabooseId)

    if (themeLeaderId !== inProgressTheme.quickThemes.leader || themeCabooseId !== inProgressTheme.quickThemes.caboose) {
      await quickThemesDb.update(inProgressTheme.quickThemes.id, {
        leader: themeLeaderId,
        caboose: themeCabooseId
      })
      const strings = await stringsDb.getMany([
        'quickThemesLeaderOrCabooseChange',
        'themeCurrent',
        'themeLeader',
        'themeCaboose',
        'themeOnDeck'
      ])
      return [
        `${strings.quickThemesLeaderOrCabooseChange} ${strings.themeLeader}${themeLeaderProfile.nickname}, ${strings.themeCaboose}${themeCabooseProfile.nickname}`,
        `${strings.themeCurrent} ${inProgressTheme.quickThemeTracker.currentThemeName}. ${strings.themeOnDeck} ${inProgressTheme.quickThemeTracker.nextThemeName}`
      ]
    }
  }
}
