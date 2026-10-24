import express from 'express'
import { cardValidation } from '~/validations/cardValidation'
import { cardController } from '~/controllers/cardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, cardValidation.createNew, cardController.createNew)

Router.route('/:id')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('cardCover'),
    cardValidation.update,
    cardController.update
  )
  .delete(
    authMiddleware.isAuthorized,
    cardValidation.deleteItem,
    cardController.deleteItem
  )

// Xử lý tệp đính kèm (Attachments)
Router.route('/:id/attachments')
  .post(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.uploadAttachment.single('attachment'),
    cardController.addAttachment
  )

Router.route('/:id/attachments/:attachmentId')
  .delete(
    authMiddleware.isAuthorized,
    cardController.deleteAttachment
  )

export const cardRouter = Router
