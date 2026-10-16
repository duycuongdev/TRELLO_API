import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { boardRouter } from './boardRoute'
import { columnRouter } from './columnRouter'
import { cardRouter } from './cardRouter'
import { userRoute } from './userRoute'
import { invitationRoute } from './invitationRoute'

const Router = express.Router()

// check api
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use' })
})

// boads api
Router.use('/boards', boardRouter )

// boads api
Router.use('/columns', columnRouter )

// boads api
Router.use('/cards', cardRouter )

// user api
Router.use('/users', userRoute )

// invitation api
Router.use('/invitations', invitationRoute )

export const APIs_V1 = Router
