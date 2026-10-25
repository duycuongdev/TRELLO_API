// Lưu ý Brevo là tên thương hiệu mới của sib – Sendinblue
// Vì thế trong phần hướng dẫn trên github có thể nó vẫn còn giữ tên biến SibApiV3Sdk
// https://github.com/getbrevo/brevo-node
const SibApiV3Sdk = require('@getbrevo/brevo')
import { env } from '~/config/environment'

/**
 * Có thể xem thêm phần docs cấu hình theo từng ngôn ngữ khác nhau tùy dự án ở Brevo Dashboard > Account > SMTP & API > API Keys
 * https://brevo.com
 * Với Nodejs thì tốt nhất cứ lên github repo của bọn nó là nhanh nhất:
 * https://github.com/getbrevo/brevo-node
 */
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
let apiKey = apiInstance.authentications['apiKey']
if (env.BREVO_API_KEY) {
  apiKey.apiKey = env.BREVO_API_KEY.trim()
}

const sendEmail = async (recipientEmail, customSubject, htmlContent) => {
  // Đảm bảo apiKey luôn lấy giá trị mới nhất được trim khoảng trắng
  if (env.BREVO_API_KEY) {
    apiKey.apiKey = env.BREVO_API_KEY.trim()
  }

  // khởi tạo 1 cái sendSmtpEmail
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

  // tài khoản gửi email
  sendSmtpEmail.sender = {
    email: env.ADMIN_EMAIL_ADDRESS ? env.ADMIN_EMAIL_ADDRESS.trim() : 'admin@trello.com',
    name: env.ADMIN_EMAIL_NAME ? env.ADMIN_EMAIL_NAME.trim() : 'Trello Admin'
  }

  // người nhận email
  // to phải là 1 array để có thể gửi cho nhiều người cùng lúc
  sendSmtpEmail.to = [
    {
      email: recipientEmail
    }
  ]

  // chủ đề email
  sendSmtpEmail.subject = customSubject

  // nội dung email
  sendSmtpEmail.htmlContent = htmlContent

  // gửi email
  return apiInstance.sendTransacEmail(sendSmtpEmail)
}

export const brevoProvider = {
  sendEmail
}
