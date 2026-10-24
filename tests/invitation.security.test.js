jest.mock('~/models/userModel', () => ({
  userModel: {
    findOneById: jest.fn(),
    findOneByEmail: jest.fn()
  }
}))
jest.mock('~/models/boardModel', () => ({
  boardModel: { findOneById: jest.fn() }
}))
jest.mock('~/models/invitationModel', () => ({
  invitationModel: {
    findPendingBoardInvitation: jest.fn(),
    createNewBoardInvitation: jest.fn(),
    findOneById: jest.fn()
  }
}))

import { invitationService } from '~/services/invitationService'
import { userModel } from '~/models/userModel'
import { boardModel } from '~/models/boardModel'
import { invitationModel } from '~/models/invitationModel'

const inviterId = '507f1f77bcf86cd799439011'
const inviteeId = '507f1f77bcf86cd799439012'
const boardId = '507f1f77bcf86cd799439013'

describe('invitation duplicate protection', () => {
  beforeEach(() => jest.clearAllMocks())

  test('rejects a second pending invitation for the same user and board', async () => {
    userModel.findOneById.mockResolvedValue({ _id: inviterId, email: 'owner@example.com' })
    userModel.findOneByEmail.mockResolvedValue({ _id: inviteeId, email: 'member@example.com' })
    boardModel.findOneById.mockResolvedValue({ _id: boardId, ownerIds: [inviterId], memberIds: [] })
    invitationModel.findPendingBoardInvitation.mockResolvedValue({ _id: 'existing-invitation' })

    await expect(invitationService.createNewBoardInvitation(
      { inviteeEmail: 'member@example.com', boardId },
      inviterId
    )).rejects.toMatchObject({ statusCode: 409 })

    expect(invitationModel.createNewBoardInvitation).not.toHaveBeenCalled()
  })

  test('allows an invitation when no pending invitation exists', async () => {
    userModel.findOneById.mockResolvedValue({ _id: inviterId, email: 'owner@example.com' })
    userModel.findOneByEmail.mockResolvedValue({ _id: inviteeId, email: 'member@example.com' })
    boardModel.findOneById.mockResolvedValue({ _id: boardId, ownerIds: [inviterId], memberIds: [] })
    invitationModel.findPendingBoardInvitation.mockResolvedValue(null)
    invitationModel.createNewBoardInvitation.mockResolvedValue({ insertedId: 'new-invitation' })
    invitationModel.findOneById.mockResolvedValue({ _id: 'new-invitation' })

    await invitationService.createNewBoardInvitation(
      { inviteeEmail: 'member@example.com', boardId },
      inviterId
    )

    expect(invitationModel.createNewBoardInvitation).toHaveBeenCalled()
  })
})
