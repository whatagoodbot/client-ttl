import { clientCreds, users } from '@whatagoodbot/rpc'

const userService = new users.Users(`${process.env.USERS_SERVICE}:50051`, clientCreds)

export const getUser = id => {
  return new Promise(resolve => {
    userService.getUser({ id }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}
