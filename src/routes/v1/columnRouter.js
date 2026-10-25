import express from 'express'
import { columnValidation } from '~/validations/columnValidation'
import { columnController } from '~/controllers/columnController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, columnValidation.createNew, columnController.createNew)

Router.route('/:id')
  .put(authMiddleware.isAuthorized, columnValidation.update, columnController.update)
  .delete(authMiddleware.isAuthorized, columnValidation.deleteItem, columnController.deleteItem)

// Lưu trữ cột (Archive Column)
Router.route('/:id/archive')
  .put(authMiddleware.isAuthorized, columnController.archiveColumn)

// Khôi phục cột (Restore Column)
Router.route('/:id/restore')
  .put(authMiddleware.isAuthorized, columnController.restoreColumn)

export const columnRouter = Router

