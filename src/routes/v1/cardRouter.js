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

// Xử lý bình luận (Comments)
Router.route('/:id/comments/:commentId')
  .put(
    authMiddleware.isAuthorized,
    cardValidation.updateComment,
    cardController.updateComment
  )
  .delete(
    authMiddleware.isAuthorized,
    cardController.deleteComment
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

// Sao chép thẻ (Copy Card)
Router.route('/:id/copy')
  .post(
    authMiddleware.isAuthorized,
    cardValidation.copyCard,
    cardController.copyCard
  )

// Lưu trữ thẻ (Archive Card)
Router.route('/:id/archive')
  .put(
    authMiddleware.isAuthorized,
    cardController.archiveCard
  )

// Khôi phục thẻ (Restore Card)
Router.route('/:id/restore')
  .put(
    authMiddleware.isAuthorized,
    cardController.restoreCard
  )

export const cardRouter = Router
