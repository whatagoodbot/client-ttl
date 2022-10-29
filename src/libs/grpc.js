import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const packageDefinition = protoLoader.loadSync('./src/protos/user.proto')

const userProto = grpc.loadPackageDefinition(packageDefinition)
const userService = new userProto.Users(`${process.env.USERS_SERVICE}:50051`, grpc.credentials.createInsecure())

export const getUser = id => {
  return new Promise(resolve => {
    userService.getUserDetails({ id }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}
