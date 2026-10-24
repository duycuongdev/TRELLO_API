import { StatusCodes } from 'http-status-codes'
import { cardService } from '~/services/cardService'

const createNew = async (req, res, next) => {
  try {
    const createCard = await cardService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(createCard)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const cardCoverFile = req.file
    const userInfo = req.jwtDecoded
    const updatedCard = await cardService.update(cardId, req.body, cardCoverFile, userInfo)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const updateComment = async (req, res, next) => {
  try {
    const { id: cardId, commentId } = req.params
    const { content } = req.body
    const userId = req.jwtDecoded._id
    const updatedCard = await cardService.updateComment(cardId, commentId, content, userId)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const deleteComment = async (req, res, next) => {
  try {
    const { id: cardId, commentId } = req.params
    const userId = req.jwtDecoded._id
    const updatedCard = await cardService.deleteComment(cardId, commentId, userId)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const addAttachment = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const file = req.file
    const updatedCard = await cardService.addAttachment(cardId, file)
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const deleteAttachment = async (req, res, next) => {
  try {
    const { id: cardId, attachmentId } = req.params
    const updatedCard = await cardService.deleteAttachment(cardId, attachmentId)
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const deleteItem = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userId = req.jwtDecoded._id
    const result = await cardService.deleteItem(cardId, userId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const cardController = {
  createNew,
  update,
  updateComment,
  deleteComment,
  addAttachment,
  deleteAttachment,
  deleteItem
}
