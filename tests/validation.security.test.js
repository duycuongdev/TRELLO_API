import { cardValidation } from '~/validations/cardValidation'
import { columnValidation } from '~/validations/columnValidation'
import { userValidation } from '~/validations/userValidation'

const runValidation = async (middleware, body) => {
  const next = jest.fn()
  await middleware({ body }, {}, next)
  return next
}

describe('update payload validation', () => {
  test('rejects protected card fields', async () => {
    const next = await runValidation(cardValidation.update, { title: 'Valid title', boardId: '507f1f77bcf86cd799439011' })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }))
  })

  test('accepts supported card member action', async () => {
    const next = await runValidation(cardValidation.update, {
      incomingMemberInfor: { userId: '507f1f77bcf86cd799439011', action: 'ADD' }
    })
    expect(next).toHaveBeenCalledWith()
  })

  test('rejects unknown column and user fields', async () => {
    const columnNext = await runValidation(columnValidation.update, { title: 'Column', boardId: 'x' })
    const userNext = await runValidation(userValidation.update, { displayName: 'User', role: 'admin' })
    expect(columnNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }))
    expect(userNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }))
  })
})
