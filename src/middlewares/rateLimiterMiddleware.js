import rateLimit from 'express-rate-limit'
import { StatusCodes } from 'http-status-codes'

// Giới hạn số lần đăng nhập / đăng ký: tối đa 10 lần trong 15 phút trên mỗi IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Giới hạn số lần gửi lời mời tham gia board: tối đa 30 lần trong 15 phút trên mỗi IP
const invitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: {
    message: 'Too many invitations sent from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

export const rateLimiterMiddleware = {
  authLimiter,
  invitationLimiter
}
