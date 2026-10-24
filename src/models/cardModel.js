import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { CARD_MEMBER_ACTION, CARD_CHECKLIST_ACTION } from '~/utils/constants'

// Define Collection (name & schema)
const CARD_COLLECTION_NAME = 'cards'
const CARD_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  title: Joi.string().required().min(3).max(50).trim().strict(),
  description: Joi.string().optional(),
  cover: Joi.string().default(null),
  dueDate: Joi.date().timestamp('javascript').allow(null).default(null),
  labels: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required().min(1).max(30).trim().strict(),
      color: Joi.string().required().pattern(/^#[0-9A-Fa-f]{6}$/)
    })
  ).default([]),
  memberIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  // Dữ liệu comments của Card chúng ta sẽ học cách nhúng -- embedded vào bản ghi Card luôn như dưới đây:
  comments: Joi.array().items({
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userEmail: Joi.string().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    userAvatar: Joi.string(),
    userDisplayName: Joi.string(),
    content: Joi.string(),
    // Chỗ này lưu ý vì dùng hàm $push để thêm comment nên không set default Date.now luôn giống hàm insertOne khi create được.
    commentedAt: Joi.date().timestamp()
  }).default([]),
  // Dữ liệu checklists nhúng (embedded) vào card, mỗi checklist có nhiều items
  checklists: Joi.array().items(
    Joi.object({
      id: Joi.string().required(), // uuid - unique id của checklist
      title: Joi.string().required().trim(), // tên checklist
      items: Joi.array().items(
        Joi.object({
          id: Joi.string().required(), // uuid - unique id của item
          title: Joi.string().required().trim(), // nội dung item
          isCompleted: Joi.boolean().default(false) // đã hoàn thành chưa
        })
      ).default([])
    })
  ).default([]),
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
    // biến đổi 1 số dữ liệu liên quan đến objectId chuẩn chỉnh
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
    // lọc nhưng field không cho phép cập nhật linh tinh
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
      // trả về kết quả mới sau khi cập nhật
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

const updateMembers = async (cardId, incomingMemberInfo) => {
  try {
    // Tạo ra một biến updateCondition ban đầu là rỗng
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
        updateCondition, // truyền cái updateCondition ở đây
        { returnDocument: 'after' }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xử lý toàn bộ các action liên quan đến Checklist của Card
 * Vì checklists là embedded array trong card nên chúng ta lấy toàn bộ card ra,
 * xử lý logic trên JS rồi $set lại toàn bộ mảng checklists vào DB.
 * Đây là cách tiếp cận đơn giản và rõ ràng cho embedded document.
 */
const updateChecklists = async (cardId, incomingChecklistInfo) => {
  try {
    // Lấy card hiện tại để thao tác trên mảng checklists
    const card = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: new ObjectId(cardId) })
    if (!card) throw new Error('Card not found!')

    // Clone mảng checklists hiện tại để thao tác (tránh mutate trực tiếp)
    let updatedChecklists = card.checklists ? [...card.checklists] : []

    const { action, checklistId, checklist, checklistItemId, checklistItem } = incomingChecklistInfo

    if (action === CARD_CHECKLIST_ACTION.ADD_CHECKLIST) {
      // Thêm checklist mới vào cuối mảng
      updatedChecklists.push(checklist)
    }

    if (action === CARD_CHECKLIST_ACTION.DELETE_CHECKLIST) {
      // Xóa checklist theo checklistId
      updatedChecklists = updatedChecklists.filter(cl => cl.id !== checklistId)
    }

    if (action === CARD_CHECKLIST_ACTION.ADD_CHECKLIST_ITEM) {
      // Tìm checklist theo id rồi push item mới vào
      const targetChecklist = updatedChecklists.find(cl => cl.id === checklistId)
      if (targetChecklist) {
        targetChecklist.items.push(checklistItem)
      }
    }

    if (action === CARD_CHECKLIST_ACTION.UPDATE_CHECKLIST_ITEM) {
      // Tìm checklist → tìm item → toggle isCompleted hoặc update title
      const targetChecklist = updatedChecklists.find(cl => cl.id === checklistId)
      if (targetChecklist) {
        const targetItem = targetChecklist.items.find(item => item.id === checklistItemId)
        if (targetItem) {
          // Merge các field được update vào item (isCompleted, title...)
          Object.assign(targetItem, checklistItem)
        }
      }
    }

    if (action === CARD_CHECKLIST_ACTION.DELETE_CHECKLIST_ITEM) {
      // Tìm checklist → xóa item theo checklistItemId
      const targetChecklist = updatedChecklists.find(cl => cl.id === checklistId)
      if (targetChecklist) {
        targetChecklist.items = targetChecklist.items.filter(item => item.id !== checklistItemId)
      }
    }

    // Sau khi xử lý xong → $set lại toàn bộ mảng checklists vào DB
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $set: { checklists: updatedChecklists, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const cardModel = {
  CARD_COLLECTION_NAME,
  CARD_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update,
  deleteManyByColumnId,
  unshiftNewComment,
  updateMembers,
  updateChecklists
}