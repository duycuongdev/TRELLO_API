import express from 'express'
import { columnValidation } from '~/validations/columnValidation'
import { columnController } from '~/controllers/columnController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { authorizationMiddleware } from '~/middlewares/authorizationMiddleware'

const { requireColumnBoardMember } = authorizationMiddleware

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, requireColumnBoardMember, columnValidation.createNew, columnController.createNew)

Router.route('/:id')
  .put(authMiddleware.isAuthorized, requireColumnBoardMember, columnValidation.update, columnController.update)
  .delete(authMiddleware.isAuthorized, requireColumnBoardMember, columnValidation.deleteItem, columnController.deleteItem)

export const columnRouter = Router

