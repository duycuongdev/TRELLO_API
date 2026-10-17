/* eslint-disable no-console */
import express from 'express'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from './middlewares/errorHandlingMiddleware'
import cors from 'cors'
import { corsOptions } from './config/cors'
import cookieParser from 'cookie-parser'
import socketIo from 'socket.io'
import http from 'http'
import { inviteUserToBoardSocket } from './sockets/inviteUserToBoardSocket'

const START_SERVER = () => {
  const app = express()
  app.use(cookieParser())

  // Fix cái vụ Cache from disk của ExpressJS
  // https://stackoverflow.com/a/53240717/8324172
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  app.use(cors(corsOptions))
  // enable req.body json data
  app.use(express.json())

  app.use('/v1', APIs_V1)

  // API trả về cho UptimeRobot để check health (tránh lỗi 404)
  app.get('/', (req, res) => {
    res.status(200).json({ message: 'API is running!' })
  })

  // midleware xử lý lỗi tập chung
  app.use(errorHandlingMiddleware)

  // create new server nested in express app
  const server = http.createServer(app)

  // create new socket.io server
  const io = new socketIo.Server(server, { cors: corsOptions })
  io.on('connection', (socket) => {
    inviteUserToBoardSocket(socket)
  })

  if (env.BUILD_MODE === 'production') {
    server.listen(process.env.PORT, () => {
      console.log(`Production Hello ${env.AUTHOR}, Back-end sever is running successfully at Port ${process.env.PORT}`)
    })
  } else {
    server.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
      console.log(`Local Dev Hello ${env.AUTHOR}, Back-end sever is running successfully at Host ${env.LOCAL_DEV_APP_HOST} and Port: ${env.LOCAL_DEV_APP_PORT}`)
    })
  }

  // thực hiện tác vụ cleanup trước khi dừng server lại
  exitHook(() => {
    console.log('disconnecting')
    CLOSE_DB()
    console.log('disconnected')

  })
}

// chỉ khi kết nối Database thành công mới start server backend lên
// immediately-invoked / anonymous async function (IIFF)
(async () => {
  try {
    console.log('Connecting to MongoDB Clould Atlas!')
    await CONNECT_DB()
    console.log('Connected to MongoDB Clould Atlas!')

    START_SERVER()
  } catch (error) {
    console.log(error)
    process.exit(0)
  }
})()

