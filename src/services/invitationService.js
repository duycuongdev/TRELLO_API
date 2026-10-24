import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import { boardModel } from '~/models/boardModel'
import { invitationModel } from '~/models/invitationModel'
import { INVITATION_TYPES, BOARD_INVITATION_STATUS } from '~/utils/constants'
import { pickUser } from '~/utils/formatter'

const createNewBoardInvitation = async (reqBody, inviterId) => {
  try {
    const inviter = await userModel.findOneById(inviterId)
    const invitee = await userModel.findOneByEmail(reqBody.inviteeEmail)
    const board = await boardModel.findOneById(reqBody.boardId)

    if (!invitee || !inviter || !board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Inviter, Invitee or Board not found!')
    }

    // Không cho mời chính mình
    if (inviterId.toString() === invitee._id.toString()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot invite yourself!')
    }

    // Không cho mời người đã là owner hoặc member của board
    const existingMemberIds = [...(board.ownerIds || []), ...(board.memberIds || [])]
    const alreadyMember = existingMemberIds.some(id => id.toString() === invitee._id.toString())
    if (alreadyMember) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This user is already a member of the board!')
    }

    const newInvitationData = {
      inviterId,
      inviteeId: invitee._id.toString(),
      type: INVITATION_TYPES.BOARD_INVITATION,
      boardInvitation: {
        boardId: board._id.toString(),
        status: BOARD_INVITATION_STATUS.PENDING
      }
    }

    const createdInvitation = await invitationModel.createNewBoardInvitation(newInvitationData)
    const getInvitation = await invitationModel.findOneById(createdInvitation.insertedId)

    const resInvitation = {
      ...getInvitation,
      board,
      inviter: pickUser(inviter),
      invitee: pickUser(invitee)
    }

    return resInvitation
  } catch (error) { throw error }
}

const getInvitations = async (userId) => {
  try {
    const getInvitations = await invitationModel.findByUser(userId)
    const resInvitations = getInvitations.map(i => ({
      ...i,
      inviter: i.inviter[0] || {},
      invitee: i.invitee[0] || {},
      board: i.board[0] || {}
    }))

    return resInvitations
  } catch (error) { throw error }
}

const updateBoardInvitation = async (userId, invitationId, status) => {
  try {
    // Kiểm tra invitationId hợp lệ
    const getInvitation = await invitationModel.findOneById(invitationId)
    if (!getInvitation) throw new ApiError(StatusCodes.NOT_FOUND, 'Invitation not found!')

    // Chỉ invitee mới được accept/reject
    if (getInvitation.inviteeId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not the invitee of this invitation!')
    }

    // Chỉ được thao tác khi status còn là PENDING
    const currentStatus = getInvitation.boardInvitation?.status
    if (currentStatus !== BOARD_INVITATION_STATUS.PENDING) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Invitation has already been ${currentStatus.toLowerCase()}!`)
    }

    // Chỉ chấp nhận status hợp lệ từ client
    const ALLOWED_STATUSES = [BOARD_INVITATION_STATUS.ACCEPTED, BOARD_INVITATION_STATUS.REJECTED]
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Invalid invitation status!')
    }

    const boardId = getInvitation.boardInvitation.boardId
    const getBoard = await boardModel.findOneById(boardId)
    if (!getBoard || getBoard._destroy) throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')

    // Kiểm tra user đã là member/owner của board chưa — dùng strict comparison thay vì .includes(userId)
    if (status === BOARD_INVITATION_STATUS.ACCEPTED) {
      const boardMemberIds = [...(getBoard.ownerIds || []), ...(getBoard.memberIds || [])]
      const alreadyMember = boardMemberIds.some(id => id.toString() === userId.toString())
      if (alreadyMember) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You are already a member of this board!')
      }
    }

    const updateData = {
      boardInvitation: {
        ...getInvitation.boardInvitation,
        status: status
      }
    }

    const updatedInvitation = await invitationModel.update(invitationId, updateData)

    if (updatedInvitation.boardInvitation.status === BOARD_INVITATION_STATUS.ACCEPTED) {
      await boardModel.pushMemberIds(boardId, userId)
    }

    return updatedInvitation
  } catch (error) { throw error }
}

export const invitationService = {
  createNewBoardInvitation,
  getInvitations,
  updateBoardInvitation
}
