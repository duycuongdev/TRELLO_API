import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { boardModel } from '~/models/boardModel'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'
import ApiError from '~/utils/ApiError'

const validId = (id) => {
  try { return Boolean(id && ObjectId.isValid(id)) } catch { return false }
}

const memberOf = (board, userId) => [
  ...(board.ownerIds || []),
  ...(board.memberIds || [])
].some(id => id.toString() === userId.toString())

const loadBoard = async (boardId, userId, message = 'You do not have permission to access this board!') => {
  if (!validId(boardId)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid board ID')
  const board = await boardModel.findOneById(boardId)
  if (!board || board._destroy) throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')
  if (!memberOf(board, userId)) throw new ApiError(StatusCodes.FORBIDDEN, message)
  return board
}

const requireBoardMember = async (req, res, next) => {
  try {
    const boardId = req.params.id || req.body.boardId
    req.board = await loadBoard(boardId, req.jwtDecoded._id)
    next()
  } catch (error) { next(error) }
}

const requireBoardOwner = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const board = req.board || await loadBoard(req.params.id, userId)
    const isOwner = (board.ownerIds || []).some(id => id.toString() === userId.toString())
    if (!isOwner) throw new ApiError(StatusCodes.FORBIDDEN, 'You must be the board owner to perform this action!')
    req.board = board
    next()
  } catch (error) { next(error) }
}

const requireCardMemberBelongsToBoard = async (req, res, next) => {
  try {
    let incomingMemberInfo = req.body.incomingMemberInfor
    if (!incomingMemberInfo) return next()
    if (typeof incomingMemberInfo === 'string') {
      try { incomingMemberInfo = JSON.parse(incomingMemberInfo) } catch {
        throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Invalid card member data')
      }
    }
    if (!validId(incomingMemberInfo.userId)) {
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Invalid card member ID')
    }
    const board = req.board
    const boardUserIds = [...(board.ownerIds || []), ...(board.memberIds || [])]
    const belongsToBoard = boardUserIds.some(id => id.toString() === incomingMemberInfo.userId.toString())
    if (!belongsToBoard) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Card member must belong to the board!')
    }
    next()
  } catch (error) { next(error) }
}

const requireColumnBoardMember = async (req, res, next) => {
  try {
    let boardId = req.body.boardId
    if (req.params.id) {
      if (!validId(req.params.id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid column ID')
      const column = await columnModel.findOneById(req.params.id)
      if (!column || column._destroy) throw new ApiError(StatusCodes.NOT_FOUND, 'Column not found!')
      boardId = column.boardId
      req.column = column
    }
    req.board = await loadBoard(boardId, req.jwtDecoded._id)
    next()
  } catch (error) { next(error) }
}

const requireCardBoardMember = async (req, res, next) => {
  try {
    let boardId = req.body.boardId
    if (req.params.id) {
      if (!validId(req.params.id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid card ID')
      const card = await cardModel.findOneById(req.params.id)
      if (!card || card._destroy) throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
      boardId = card.boardId
      req.card = card
    }
    req.board = await loadBoard(boardId, req.jwtDecoded._id)
    next()
  } catch (error) { next(error) }
}

const requireInviterIsBoardMember = async (req, res, next) => {
  try {
    req.board = await loadBoard(
      req.body.boardId,
      req.jwtDecoded._id,
      'You must be a board member to invite others!'
    )
    next()
  } catch (error) { next(error) }
}

const requireMoveCardBoardMember = async (req, res, next) => {
  try {
    const { currentCardId, nextColumnId } = req.body
    if (!validId(currentCardId)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid card ID')
    const card = await cardModel.findOneById(currentCardId)
    if (!card || card._destroy) throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    const board = await loadBoard(card.boardId, req.jwtDecoded._id, 'You do not have permission to move cards on this board!')
    if (!validId(nextColumnId)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid destination column ID')
    const nextColumn = await columnModel.findOneById(nextColumnId)
    if (!nextColumn || nextColumn._destroy || nextColumn.boardId.toString() !== board._id.toString()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Destination column does not belong to this board!')
    }
    req.board = board
    req.card = card
    next()
  } catch (error) { next(error) }
}

export const authorizationMiddleware = {
  requireBoardMember,
  requireBoardOwner,
  requireColumnBoardMember,
  requireCardBoardMember,
  requireCardMemberBelongsToBoard,
  requireInviterIsBoardMember,
  requireMoveCardBoardMember
}
