jest.mock('~/models/boardModel', () => ({
  boardModel: { findOneById: jest.fn() }
}))
jest.mock('~/models/cardModel', () => ({
  cardModel: { findOneById: jest.fn() }
}))

import { authorizationMiddleware } from '~/middlewares/authorizationMiddleware'
import { boardModel } from '~/models/boardModel'
import { cardModel } from '~/models/cardModel'

const userId = '507f1f77bcf86cd799439011'
const memberId = '507f1f77bcf86cd799439012'
const boardId = '507f1f77bcf86cd799439013'
const cardId = '507f1f77bcf86cd799439014'

const runMiddleware = async (middleware, req) => {
  const next = jest.fn()
  await middleware(req, {}, next)
  return next
}

describe('authorization middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  test('allows only board owners through owner middleware', async () => {
    boardModel.findOneById.mockResolvedValue({ _id: boardId, ownerIds: [userId], memberIds: [] })
    const next = await runMiddleware(authorizationMiddleware.requireBoardOwner, {
      params: { id: boardId },
      jwtDecoded: { _id: userId }
    })
    expect(next).toHaveBeenCalledWith()
  })

  test('rejects board members who are not owners', async () => {
    boardModel.findOneById.mockResolvedValue({ _id: boardId, ownerIds: [memberId], memberIds: [userId] })
    const next = await runMiddleware(authorizationMiddleware.requireBoardOwner, {
      params: { id: boardId },
      jwtDecoded: { _id: userId }
    })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  test('rejects card members outside the board', async () => {
    cardModel.findOneById.mockResolvedValue({ _id: cardId, boardId, _destroy: false })
    boardModel.findOneById.mockResolvedValue({ _id: boardId, ownerIds: [userId], memberIds: [] })
    const next = await runMiddleware(authorizationMiddleware.requireCardMemberBelongsToBoard, {
      body: { incomingMemberInfor: { userId: memberId, action: 'ADD' } },
      board: { ownerIds: [userId], memberIds: [] }
    })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  test('accepts JSON card member payload for multipart requests', async () => {
    const next = await runMiddleware(authorizationMiddleware.requireCardMemberBelongsToBoard, {
      body: { incomingMemberInfor: JSON.stringify({ userId: memberId, action: 'ADD' }) },
      board: { ownerIds: [userId], memberIds: [memberId] }
    })
    expect(next).toHaveBeenCalledWith()
  })
})
