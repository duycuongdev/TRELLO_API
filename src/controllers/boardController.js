import { StatusCodes } from 'http-status-codes'
import { boardService } from '~/services/boardService'

const createNew = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    // điều hướng sang service
    const createBoard = await boardService.createNew(userId, req.body)

    // có kết quả thì trả về Client
    res.status(StatusCodes.CREATED).json(createBoard)
  } catch (error) { next(error) }
}

const getDetails = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const boardId = req.params.id
    const board = await boardService.getDetails(userId, boardId)

    res.status(StatusCodes.OK).json(board)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const boardId = req.params.id
    const boardBackgroundFile = req.file
    const updatedBoard = await boardService.update(boardId, req.body, boardBackgroundFile)

    res.status(StatusCodes.OK).json(updatedBoard)
  } catch (error) { next(error) }
}

const moveCardToDifferentColumn = async (req, res, next) => {
  try {
    const result = await boardService.moveCardToDifferentColumn(req.body)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const getBoards = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { page, itemsPerPage, q: queryFilter } = req.query
    const results = await boardService.getBoards(userId, page, itemsPerPage, queryFilter)

    res.status(StatusCodes.OK).json(results)
  } catch (error) { next(error) }
}

const removeMember = async (req, res, next) => {
  try {
    const currentUserId = req.jwtDecoded._id
    const { boardId, userId } = req.params
    const result = await boardService.removeMember(currentUserId, boardId, userId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const boardController = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards,
  removeMember
}
