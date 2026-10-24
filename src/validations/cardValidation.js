import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { CARD_MEMBER_ACTION, CARD_CHECKLIST_ACTION } from '~/utils/constants'

const dueDateSchema = Joi.date()
  .timestamp('javascript')
  .allow(null)
  .custom((value, helpers) => {
    if (value === null) return value

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (value < today) {
      return helpers.error('date.min')
    }

    return value
  })
  .messages({
    'date.min': 'Due date cannot be in the past'
  })

const labelsSchema = Joi.array().items(
  Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required().min(1).max(30).trim().strict(),
    color: Joi.string().required().pattern(/^#[0-9A-Fa-f]{6}$/)
  })
).max(20)

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    title: Joi.string().required().min(3).max(50).trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const update = async (req, res, next) => {
  // Lưu ý không dùng hàm required() trong trường hợp Update
  const correctCondition = Joi.object({
    title: Joi.string().min(3).max(50).trim().strict(),
    description: Joi.string().optional(),
    dueDate: dueDateSchema,
    labels: labelsSchema,
    commentToAdd: Joi.object({
      userAvatar: Joi.string().allow(''),
      userDisplayName: Joi.string().allow(''),
      content: Joi.string().required().trim().strict()
    }),
    incomingMemberInfor: Joi.object({
      userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
      action: Joi.string().valid(CARD_MEMBER_ACTION.ADD, CARD_MEMBER_ACTION.REMOVE).required()
    }),
    incomingChecklistInfo: Joi.object({
      action: Joi.string().valid(...Object.values(CARD_CHECKLIST_ACTION)).required(),
      checklistId: Joi.string(),
      checklist: Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required().trim().strict(),
        items: Joi.array().items(Joi.object({
          id: Joi.string().required(),
          title: Joi.string().required().trim().strict(),
          isCompleted: Joi.boolean().default(false)
        })).default([])
      }),
      checklistItemId: Joi.string(),
      checklistItem: Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required().trim().strict(),
        isCompleted: Joi.boolean().required()
      })
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const cardValidation = {
  createNew,
  update
}
