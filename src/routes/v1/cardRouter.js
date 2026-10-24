import express from 'express'
import { cardValidation } from '~/validations/cardValidation'
import { cardController } from '~/controllers/cardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { authorizationMiddleware } from '~/middlewares/authorizationMiddleware'

const { requireCardBoardMember, requireCardMemberBelongsToBoard } = authorizationMiddleware

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, requireCardBoardMember, cardValidation.createNew, cardController.createNew)

Router.route('/:id')
  .put(
    authMiddleware.isAuthorized,
    requireCardBoardMember,
    multerUploadMiddleware.upload.single('cardCover'),
    requireCardMemberBelongsToBoard,
    cardValidation.update,
    cardController.update
  )

export const cardRouter = Router