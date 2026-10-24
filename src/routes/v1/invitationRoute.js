import express from 'express'
import { invitationValidation } from '~/validations/invitationValidation'
import { invitationController } from '~/controllers/invitationController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { authorizationMiddleware } from '~/middlewares/authorizationMiddleware'

const { requireInviterIsBoardMember } = authorizationMiddleware

const Router = express.Router()

Router.route('/board')
  .post(
    authMiddleware.isAuthorized,
    requireInviterIsBoardMember,
    invitationValidation.createNewBoardInvitation,
    invitationController.createNewBoardInvitation
  )

// Get invitations by User
Router.route('/')
  .get(authMiddleware.isAuthorized, invitationController.getInvitations)

Router.route('/board/:invitationId')
  .put(authMiddleware.isAuthorized, invitationController.updateBoardInvitation)

export const invitationRoute = Router