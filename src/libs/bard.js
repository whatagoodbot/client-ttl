import { createClient } from 'redis'
import fetch from 'node-fetch'
import Bard, { askAI } from 'bard-ai'
import { postMessage } from './cometchat.js'
import removeMd from 'remove-markdown'

globalThis.fetch = fetch

const questionPrefix = `Assume you are a big fan of ${process.env.FAVOURITE_ARTIST} and answer this question.`
const trackPrefix = 'tell me about the song'

const cache = createClient()
cache.on('error', err => console.log('Redis Client Error', err))
await cache.connect()
await Bard.init(process.env.BARD_COOKIE)

const getResponse = async (cacheKey, prefix, query, room) => {
  const cachedResult = await cache.get(cacheKey)
  if (cachedResult) return JSON.parse(cachedResult).content
  if (room) {
    postMessage({
      room,
      message: 'Hmmm... let me think about that.'
    })
  }
  const result = await askAI(`${prefix} ${query}`, true)
  if (result.content) {
    result.content = removeMd(result.content)
  }
  await cache.set(cacheKey, JSON.stringify(result))
  return result.content
}

export const askQuestion = async (question, room) => {
  const cacheKey = `TTL:BARD:QUERY:${question.toUpperCase().trim()}`
  return await getResponse(cacheKey, questionPrefix, question, room)
}

export const getTrackFact = async (track) => {
  const cacheKey = `TTL:BARD:TRACK:${track.toUpperCase().trim()}`
  return await getResponse(cacheKey, trackPrefix, track)
}
