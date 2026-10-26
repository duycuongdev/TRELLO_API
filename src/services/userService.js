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
    const recipientName = userToProcess.displayName || userToProcess.username || userToProcess.email.split('@')[0]
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email address</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #172b4d;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 16px rgba(9, 30, 66, 0.08); overflow: hidden; border: 1px solid #ebecf0;">
                <!-- Header / Logo -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #0052cc 0%, #0c66e4 100%); padding: 32px 20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 6px;">
                            <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Trello</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 32px 24px 32px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #172b4d;">
                      Verify your email address 🎉
                    </h2>
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #42526e;">
                      Hi <strong>${recipientName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #42526e;">
                      Thank you for signing up for Trello! To finish setting up your account and get started with your boards, please verify that <strong>${userToProcess.email}</strong> belongs to you.
                    </p>

                    <!-- CTA Button -->
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center" style="border-radius: 6px;" bgcolor="#0052cc">
                          <a href="${verifiCationLink}" target="_blank" style="font-size: 15px; font-family: inherit; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 32px; display: inline-block; font-weight: 600; letter-spacing: 0.2px;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 1.5; color: #6b778c;">
                      Button not working? You can also copy and paste this link into your browser:
                    </p>
                    <div style="background-color: #f4f5f7; border: 1px solid #dfe1e6; border-radius: 6px; padding: 12px; font-size: 12px; word-break: break-all; color: #0052cc; font-family: Consolas, Monaco, monospace; line-height: 1.4;">
                      <a href="${verifiCationLink}" target="_blank" style="color: #0052cc; text-decoration: underline;">${verifiCationLink}</a>
                    </div>

                    <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #8993a4;">
                      If you didn't create an account with Trello, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 32px;">
                    <div style="border-top: 1px solid #ebecf0;"></div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 24px 32px; background-color: #fafbfc;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #8993a4;">
                      This message was sent from Trello Workspace.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #8993a4;">
                      © ${new Date().getFullYear()} Trello. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
