import { StatusCodes } from 'http-status-codes'
import { jwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'

// Middleware này sẽ đảm nhiệm việc quan trọng: Xác thực cái JWT accessToken nhận được từ phía FE có hợp lệ hay không
const isAuthorized = async (req, res, next) => {
  // Lấy accessToken nằm trong request cookies phía client – withCredentials trong file authorizeAxios
  const clientAccessToken = req.cookies?.accessToken

  // Nếu không có accessToken trong request cookies thì trả về lỗi 401
  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized, token not found'))
    return
  }

  try {
    // Bước 01: Thực hiện giải mã token xem nó có hợp lệ hay là không
    const accessTokenDecoded = await jwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)

    // Bước 02: Quan trọng: Kiểm tra xem user có thực sự còn tồn tại trong DB và chưa bị xóa / khóa tài khoản
    const user = await userModel.findOneById(accessTokenDecoded._id)
    if (!user || user._destroy || !user.isActive) {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'User not found or account is deactivated!'))
      return
    }

    // Bước 03: Lưu thông tin giải mã được và thông tin user hiện tại vào request
    req.jwtDecoded = accessTokenDecoded
    req.currentUser = user

    // Bước 04: Cho phép cái request đi tiếp
    next()
  } catch (error) {
    // Nếu cái accessToken nó bị hết hạn (expired) thì mình cần trả về một cái mã lỗi cho phía FE biết để gọi api refreshToken
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Need refresh token, access token expired'))
      return
    }

    // Nếu như cái accessToken nó không hợp lệ do bất kỳ điều gì khác vụ hết hạn thì chúng ta cứ thẳng tay trả về mã 401 cho phía FE gọi api sign_out luôn
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized'))
  }
}

export const authMiddleware = {
  isAuthorized
}
