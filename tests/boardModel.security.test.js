jest.mock('~/config/mongodb', () => ({
  GET_DB: jest.fn()
}))
jest.mock('~/models/columnModel', () => ({ columnModel: {} }))
jest.mock('~/models/cardModel', () => ({ cardModel: {} }))
jest.mock('~/models/userModel', () => ({ userModel: {} }))

import { GET_DB } from '~/config/mongodb'
import { boardModel } from '~/models/boardModel'

const boardId = '507f1f77bcf86cd799439011'

describe('board model update protection', () => {
  test('does not persist protected board fields', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({})
    GET_DB.mockReturnValue({ collection: () => ({ findOneAndUpdate }) })

    const updateData = {
      title: 'Updated title',
      ownerIds: ['507f1f77bcf86cd799439012'],
      memberIds: ['507f1f77bcf86cd799439013'],
      _destroy: true,
      slug: 'forged-slug',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await boardModel.update(boardId, updateData)

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { $set: { title: 'Updated title' } },
      { returnDocument: 'after' }
    )
  })
})
