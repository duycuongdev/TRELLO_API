import { StatusCodes } from 'http-status-codes'
import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { boardModel } from '~/models/boardModel'
import { cloudinaryProvider } from '~/providers/CloundinaryProvider'
import ApiError from '~/utils/ApiError'

const createNew = async (reqBody) => {
  try {
    const newCard = {
      ...reqBody
    }
    const createCard = await cardModel.createNew(newCard)
    const getNewCard = await cardModel.findOneById(createCard.insertedId)

    if (getNewCard) {
      await columnModel.pushCardOrderIds(getNewCard)
    }

    return getNewCard
  } catch (error) { throw error }
}

const update = async (cardId, reqBody, cardCoverFile, userInfo) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }

    let updatedCard = {}

    if (cardCoverFile) {
      const uploadResult = await cloudinaryProvider.streamUpload(cardCoverFile.buffer, 'cardCovers')
      updatedCard = await cardModel.update(cardId, {
        cover: uploadResult.secure_url
      })
    } else if (updateData.commentToAdd) {
      const commentData = {
        ...updateData.commentToAdd,
        userId: userInfo._id,
        userEmail: userInfo.email,
        commentedAt: Date.now()
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
    } else if (updateData.incomingMemberInfo || updateData.incomingMemberInfor) {
      const memberInfo = updateData.incomingMemberInfo || updateData.incomingMemberInfor
      updatedCard = await cardModel.updateMembers(cardId, memberInfo)
    } else {
      updatedCard = await cardModel.update(cardId, updateData)
    }

    return updatedCard
  } catch (error) { throw error }
}

const deleteItem = async (cardId, userId) => {
  try {
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Verify user authorization: user must be board owner or board member
    const board = await boardModel.findOneById(targetCard.boardId)
    if (!board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')
    }
    const isOwner = board.ownerIds?.some(id => id.toString() === userId.toString())
    const isMember = board.memberIds?.some(id => id.toString() === userId.toString())
    if (!isOwner && !isMember) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to delete this card!')
    }

    // Xóa card
    await cardModel.deleteOneById(cardId)

    // Xóa cardId khỏi mảng cardOrderIds của column chứa nó
    await columnModel.pullCardOrderIds(targetCard)

    return { deleteResult: 'Card deleted successfully!' }
  } catch (error) { throw error }
}

export const cardService = {
  createNew,
  update,
  deleteItem
}
