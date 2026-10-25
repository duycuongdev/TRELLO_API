import express from 'express'
import { boardValidation } from '~/validations/boardValidation'
import { boardController } from '~/controllers/boardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

Router.route('/')
  .get(authMiddleware.isAuthorized, boardController.getBoards)
  .post(authMiddleware.isAuthorized, boardValidation.createNew, boardController.createNew)

Router.route('/:id')
  .get(authMiddleware.isAuthorized, boardController.getDetails)
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('boardBackground'),
    boardValidation.update,
    boardController.update
  )
  .delete(authMiddleware.isAuthorized, boardController.deleteBoard)

Router.route('/:id/close')
  .put(authMiddleware.isAuthorized, boardController.closeBoard)

Router.route('/:id/reopen')
  .put(authMiddleware.isAuthorized, boardController.reopenBoard)

Router.route('/:id/archived_items')
  .get(authMiddleware.isAuthorized, boardController.getArchivedItems)

Router.route('/supports/moving_card')
  .put(authMiddleware.isAuthorized, boardValidation.moveCardToDifferentColumn, boardController.moveCardToDifferentColumn)

Router.route('/:boardId/members/:userId')
  .delete(authMiddleware.isAuthorized, boardValidation.removeMember, boardController.removeMember)

export const boardRouter = Router
