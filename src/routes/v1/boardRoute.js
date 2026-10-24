import express from 'express'
import { boardValidation } from '~/validations/boardValidation'
import { boardController } from '~/controllers/boardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { authorizationMiddleware } from '~/middlewares/authorizationMiddleware'

const { requireBoardMember, requireBoardOwner, requireMoveCardBoardMember } = authorizationMiddleware

const Router = express.Router()

Router.route('/')
  .get(authMiddleware.isAuthorized, boardController.getBoards)
  .post(authMiddleware.isAuthorized, boardValidation.createNew, boardController.createNew)

Router.route('/:id')
  .get(authMiddleware.isAuthorized, requireBoardMember, boardController.getDetails)
  .put(authMiddleware.isAuthorized, requireBoardMember, requireBoardOwner, boardValidation.update, boardController.update)

Router.route('/supports/moving_card')
  .put(authMiddleware.isAuthorized, requireMoveCardBoardMember, boardValidation.moveCardToDifferentColumn, boardController.moveCardToDifferentColumn)

export const boardRouter = Router