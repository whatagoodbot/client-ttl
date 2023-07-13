import { getTTUser } from '../libs/ttlive.js'
import { postMessage } from '../libs/cometchat.js'

export default async (payload, room) => {
  if (!payload.userUuid) return
  if ([process.env.CHAT_USER_ID, process.env.CHAT_REPLY_ID].includes(payload.userUuid)) return
  const userProfile = await getTTUser(payload.userUuid)
  if (userProfile?.nickname?.length > 0) {
    postMessage({
      room,
      message: `Welcome @${userProfile.nickname}... feel free to ask me any questions!`,
      mentions: [{
        position: 8,
        nickname: userProfile.nickname,
        userId: payload.userUuid
      }]
    })
  }
}
