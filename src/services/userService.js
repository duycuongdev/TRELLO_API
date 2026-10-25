import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatter'
import { WEBSITE_DOMAINS } from '~/utils/constants'
import { brevoProvider } from '~/providers/BrevoProvider'
import { jwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import { cloudinaryProvider } from '~/providers/CloundinaryProvider'

const createNew = async (reqBody) => {
  try {
    // kiểm tra xem email đã tồn tại chưa
    const existUser = await userModel.findOneByEmail(reqBody.email)
    let userToProcess = null

    if (existUser) {
      if (existUser.isActive) {
        throw new ApiError(StatusCodes.CONFLICT, 'Email already exists and is already verified!')
      }
      // Trường hợp tài khoản đã tạo trước đó nhưng chưa verify (ví dụ do lỗi gửi email)
      // Cho phép cập nhật mật khẩu mới và sinh verifyToken mới để gửi lại email xác thực
      const newVerifyToken = uuidv4()
      const newPasswordHash = bcrypt.hashSync(reqBody.password, 8)
      userToProcess = await userModel.update(existUser._id, {
        password: newPasswordHash,
        verifyToken: newVerifyToken
      })
    } else {
      // tạo data lưu vào DB
      const nameFromEmail = reqBody.email.split('@')[0]
      const newUser = {
        email: reqBody.email,
        // 8: số vòng lặp băm, càng nhiều vòng lặp thì càng an toàn nhưng sẽ tốn thời gian hơn
        password: bcrypt.hashSync(reqBody.password, 8),
        username: nameFromEmail,
        displayName: nameFromEmail,
        verifyToken: uuidv4()
      }

      // lưu vào DB
      const createdUser = await userModel.createNew(newUser)
      userToProcess = await userModel.findOneById(createdUser.insertedId)
    }

    // gửi email xác thực cho user
    const verifiCationLink = `${WEBSITE_DOMAINS}/account/verification?email=${userToProcess.email}&token=${userToProcess.verifyToken}`

    // In link xác thực ra console server (Render Logs) để tiện kích hoạt ngay
    // eslint-disable-next-line no-console
    console.log(`🔗 [VERIFICATION LINK] for ${userToProcess.email}: ${verifiCationLink}`)

    const customSubject = 'Verify your email address - Trello'
    const htmlContent = `
      <h3>Verify your email address</h3>
      <p>Thank you for registering at Trello! Please click the link below to verify your account:</p>
      <p><a href="${verifiCationLink}" target="_blank" style="display:inline-block;padding:10px 20px;background:#0052cc;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Verify Account</a></p>
      <p>Or copy this link: <a href="${verifiCationLink}" target="_blank">${verifiCationLink}</a></p>
    `

    // gọi tới provider gửi email
    try {
      await brevoProvider.sendEmail(userToProcess.email, customSubject, htmlContent)
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error('⚠️ Brevo sendEmail failed:', emailError?.response?.body || emailError?.message || emailError)
      // Không để lỗi 401 của Brevo tràn ra làm API trả 401 (gây logout ở FE)
      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        'Account created, but failed to send verification email (Brevo error). Check server logs for the verification link or verify your Brevo credentials.'
      )
    }

    // trả về phía controller
    return pickUser(userToProcess)
  } catch (error) { throw error }
}

const verifyAccount = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is already active')
    if (existUser.verifyToken !== reqBody.token) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Invalid token!')

    // mọi thứ ok cập nhật lại thông tin user trong DB
    const updateData = {
      isActive: true,
      verifyToken: null
    }
    const updatedUser = await userModel.update(existUser._id, updateData)
    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const login = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active')
    if (!bcrypt.compareSync(reqBody.password, existUser.password)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your email or password is incorrect!')
    }

    // Nếu mọi thứ ok thì bắt đầu tạo Tokens đăng nhập để trả về cho phía FE
    // Thông tin sẽ đính kèm trong JWT Token bao gồm _id và email của user
    const userInfo = { _id: existUser._id, email: existUser.email }

    // Tạo ra 2 loại token, accessToken và refreshToken để trả về cho phía FE
    const accessToken = jwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )
    const refreshToken = jwtProvider.generateToken(
      userInfo,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )

    // Trả về thông tin của user kèm theo 2 cái token vừa tạo ra
    return { ...pickUser(existUser), accessToken, refreshToken }
  } catch (error) { throw error }
}

const refreshToken = async (clientRefreshToken) => {
  try {
    // Verify / giải mã cái refresh token xem có hợp lệ không
    const refreshTokenDecoded = await jwtProvider.verifyToken(clientRefreshToken, env.REFRESH_TOKEN_SECRET_SIGNATURE)

    // Đoạn này vì chúng ta chỉ lưu những thông tin unique và cố định của user trong token rồi, vì vậy có thể lấy luôn từ decoded ra, tiết kiệm query vào DB để lấy data mới.
    const userInfo = {
      _id: refreshTokenDecoded._id,
      email: refreshTokenDecoded.email
    }

    // Tạo accessToken mới
    const accessToken = await jwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )

    return { accessToken }
  } catch (error) { throw error }
}

const update = async (userId, reqBody, userAvatarFile) => {
  try {
    // Query User và kiểm tra cho chắc chắn
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Khởi tạo kết quả updated User ban đầu là empty
    let updatedUser = {}

    // Trường hợp change password
    if (reqBody.current_password && reqBody.new_password) {
      // Kiểm tra current_password có đúng không
      if (!bcrypt.compareSync(reqBody.current_password, existUser.password)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your current password is incorrect!')
      }
      // Nếu đúng thì tiến hành update password mới
      updatedUser = await userModel.update(existUser._id, { password: bcrypt.hashSync(reqBody.new_password, 8) })
    } else if (userAvatarFile) {
      // upload avatar file on cloudinary
      const uploadResult = await cloudinaryProvider.streamUpload(userAvatarFile.buffer, 'trello-users')

      // save avatar url to database
      updatedUser = await userModel.update(existUser._id, { avatar: uploadResult.secure_url })
    } else {
      // Trường hợp update thông tin chung chung (whitelist chỉ cho phép displayName)
      const updateData = {}
      if (reqBody.displayName) updateData.displayName = reqBody.displayName
      updatedUser = await userModel.update(existUser._id, updateData)
    }
    return pickUser(updatedUser)
  } catch (error) { throw error }
}

export const userService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
  update
}
