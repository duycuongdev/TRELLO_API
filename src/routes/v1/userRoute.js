import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { rateLimiterMiddleware } from '~/middlewares/rateLimiterMiddleware'

const Router = express.Router()

Router.route('/register')
  .post(rateLimiterMiddleware.registerLimiter, userValidation.createNew, userController.createNew)

Router.route('/verify')
  .put(userValidation.verifyAccount, userController.verifyAccount)

Router.route('/login')
  .post(rateLimiterMiddleware.loginLimiter, userValidation.login, userController.login)

Router.route('/google-login')
  .post(rateLimiterMiddleware.loginLimiter, userValidation.googleLogin, userController.googleLogin)

Router.route('/logout')
  .delete(userController.logout)

Router.route('/refresh_token')
  .get(userController.refreshToken)

Router.route('/me')
  .get(authMiddleware.isAuthorized, userController.getProfile)

Router.route('/update')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('avatar'),
    userValidation.update,
    userController.update
  )

export const userRoute = Router
