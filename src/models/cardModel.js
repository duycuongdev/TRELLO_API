import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { CARD_MEMBER_ACTION } from '~/utils/constants'

// Define Collection (name & schema)
const CARD_COLLECTION_NAME = 'cards'
const CARD_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  title: Joi.string().required().min(3).max(50).trim().strict(),
  description: Joi.string().optional(),
  cover: Joi.string().default(null),
  labels: Joi.array().items(
    Joi.object({
      title: Joi.string().allow('').optional(),
      color: Joi.string().required()
    })
  ).default([]),
  checklists: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional(),
      title: Joi.string().required().trim(),
      items: Joi.array().items(
        Joi.object({
          _id: Joi.string().optional(),
          title: Joi.string().required().trim(),
          isDone: Joi.boolean().default(false)
        })
      ).default([])
    })
  ).default([]),
  dueDate: Joi.date().timestamp('javascript').allow(null).default(null),
  isDueDateComplete: Joi.boolean().default(false),
  attachments: Joi.array().items(
    Joi.object({
      _id: Joi.string().required(),
      fileName: Joi.string().required(),
      fileUrl: Joi.string().required(),
      fileType: Joi.string().allow('').optional(),
      fileSize: Joi.number().optional(),
      uploadedAt: Joi.date().timestamp('javascript').default(Date.now)
    })
  ).default([]),
  memberIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  // Dữ liệu comments của Card nhúng embedded trong document Card
  comments: Joi.array().items({
    _id: Joi.string().optional(),
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userEmail: Joi.string().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    userAvatar: Joi.string(),
    userDisplayName: Joi.string(),
    content: Joi.string(),
    commentedAt: Joi.date().timestamp(),
    editedAt: Joi.date().timestamp().optional()
  }).default([]),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await CARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newCardToAdd = {
      ...validData,
      boardId: new ObjectId(validData.boardId),
      columnId: new ObjectId(validData.columnId)
    }

    const createCard = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(newCardToAdd)
    return createCard
  } catch (error) { throw new Error(error) }
}

const findOneById = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: new ObjectId(cardId) })
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (cardId, updateData) => {
  try {
    // lọc những field không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // đối với những dữ liệu liên quan ObjectId, biến đổi ở đây
    if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId)

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

const deleteManyByColumnId = async (columnId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteMany({ columnId: new ObjectId(columnId) })
    return result
  } catch (error) { throw new Error(error) }
}

// function to use push element in the first position of array
const unshiftNewComment = async (cardId, commentData) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { comments: { $each: [commentData], $position: 0 } } },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Cập nhật nội dung một comment trong Card
const updateComment = async (cardId, commentId, content) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(cardId),
        $or: [
          { 'comments._id': commentId },
          { 'comments.commentedAt': isNaN(Number(commentId)) ? -1 : Number(commentId) }
        ]
      },
      {
        $set: {
          'comments.$.content': content,
          'comments.$.editedAt': Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Xóa một comment khỏi Card
const deleteComment = async (cardId, commentId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      {
        $pull: {
          comments: {
            $or: [
              { _id: commentId },
              { commentedAt: isNaN(Number(commentId)) ? -1 : Number(commentId) }
            ]
          }
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Thêm tệp đính kèm mới vào vị trí đầu mảng attachments
const unshiftNewAttachment = async (cardId, attachmentData) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { attachments: { $each: [attachmentData], $position: 0 } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Xóa tệp đính kèm theo attachmentId
const deleteAttachment = async (cardId, attachmentId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $pull: { attachments: { _id: attachmentId } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const updateMembers = async (cardId, incomingMemberInfo) => {
  try {
    let updateCondition = {}

    if (incomingMemberInfo.action === CARD_MEMBER_ACTION.ADD) {
      updateCondition = { $push: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    if (incomingMemberInfo.action === CARD_MEMBER_ACTION.REMOVE) {
      updateCondition = { $pull: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    const result = await GET_DB()
      .collection(CARD_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(cardId) },
        updateCondition,
        { returnDocument: 'after' }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteOneById = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteOne({ _id: new ObjectId(cardId) })
    return result
  } catch (error) { throw new Error(error) }
}

export const cardModel = {
  CARD_COLLECTION_NAME,
  CARD_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update,
  deleteManyByColumnId,
  unshiftNewComment,
  updateComment,
  deleteComment,
  unshiftNewAttachment,
  deleteAttachment,
  deleteOneById,
  updateMembers
}
