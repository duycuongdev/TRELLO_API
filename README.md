# ⚙️ Trello API - Backend RESTful Services & Real-time Socket Engine

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Native%20Driver-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20Storage-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Brevo](https://img.shields.io/badge/Brevo-Transactional%20Email-0092FF?logo=sendinblue&logoColor=white)](https://www.brevo.com/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?logo=render&logoColor=white)](https://trello-api-5hh5.onrender.com)

> Hệ thống máy chủ **Backend RESTful API** và động cơ truyền thông thời gian thực (**Real-time WebSocket**) cho ứng dụng Trello Clone. Cung cấp kiến trúc dịch vụ bảo mật cao, mở rộng linh hoạt và đáp ứng hiệu năng cao cho hàng ngàn người dùng cộng tác.

---

## 🌐 Production Endpoint

- 🚀 **Base API URL**: [https://trello-api-5hh5.onrender.com/v1](https://trello-api-5hh5.onrender.com/v1)
- 🖥️ **Frontend Client**: [https://trello-web-tawny.vercel.app](https://trello-web-tawny.vercel.app)

---

## ⚡ Các Tính Năng Backend Chính (Key Backend Modules)

1. **Dual-Auth Authentication & Authorization**:
   - Tự động nhận diện token từ cả **HttpOnly Cookie** (`accessToken`) và HTTP Header (`Authorization: Bearer <token>`).
   - Hỗ trợ cơ chế **Refresh Token Rotation**: Tự động cấp lại cặp token mới khi Access Token hết hạn, hỗ trợ header `x-refresh-token`.
   - Giải quyết triệt để lỗi chặn Third-Party Cookies trên iOS Safari / Mobile ITP.
   - Xác minh token Google OAuth 2.0 an toàn phía Server qua `google-auth-library`.
2. **Cộng Tác Thời Gian Thực (Socket.IO)**:
   - Quản lý phòng theo Board ID (`board:<boardId>`).
   - Phát tán các sự kiện: Kéo thả cột, di chuyển thẻ, cập nhật nội dung, gửi lời mời người dùng, thông báo deadline tức thì.
3. **Quản Lý Bảng & Dữ Liệu Kanban**:
   - Cấu trúc dữ liệu phân cấp: **Board -> Columns -> Cards**.
   - Hỗ trợ sắp xếp thứ tự bằng mảng ID (`columnOrderIds`, `cardOrderIds`).
   - Xử lý kéo thả thẻ khác cột (cross-column drag) an toàn và tối ưu giao dịch dữ liệu.
4. **Hệ Thống Lời Mời & Nhắc Nhở Hạn Chót (Invitations & Deadlines Aggregation)**:
   - Tích hợp MongoDB Aggregation Pipeline tổng hợp đồng thời:
     - Lời mời tham gia Board từ người dùng khác (`BOARD_INVITATION`).
     - Thẻ công việc sắp hết hạn hoặc đã quá hạn được giao cho người dùng (`CARD_DEADLINE`).
5. **Dịch Vụ Lưu Trữ & Email (Media & Communication)**:
   - Tải lên tệp đính kèm và ảnh bìa thẻ trực tiếp lên Cloudinary với Multer memory storage.
   - Gửi email kích hoạt tài khoản qua Brevo RESTful Transactional Email API.

---

## 🛠 Kiến Trúc Thư Mục Backend

```text
trello-api/
├── src/
│   ├── config/               # Cấu hình môi trường (environment.js, cors.js, mongodb.js, cloudinary.js)
│   ├── controllers/          # Nhận và phản hồi HTTP requests
│   │   ├── boardController.js
│   │   ├── cardController.js
│   │   ├── columnController.js
│   │   ├── invitationController.js
│   │   └── userController.js
│   ├── middlewares/          # Middleware xác thực (authMiddleware), multer, error handler
│   ├── models/               # MongoDB Data Access Layer & Schemas (Joi validation)
│   ├── providers/            # Brevo Email Provider, Cloudinary Provider
│   ├── routes/v1/            # Khai báo các Route RESTful API theo phiên bản v1
│   ├── services/             # Business Logic xử lý nghiệp vụ chính
│   ├── sockets/              # Socket.IO Event Handlers
│   ├── utils/                # Thuật toán, formatters, JWT tokens generator
│   ├── validations/          # Joi Request Validation Schemas
│   └── server.js             # Khởi tạo Express Server & Socket.IO
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Cài Đặt & Chạy Cục Bộ (Local Setup)

```bash
# 1. Cài đặt các thư viện
npm install

# 2. Tạo file cấu hình môi trường
cp .env.example .env
```

Cấu hình các biến trong file `.env`:
```env
LOCAL_DEV_APP_HOST=localhost
LOCAL_DEV_APP_PORT=8017

MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=trello-db

AUTHOR=Duy Cuong

BUILD_MODE=dev

WEBSITE_DOMAIN_DEVELOPMENT=http://localhost:5173
WEBSITE_DOMAIN_PRODUCTION=https://trello-web-tawny.vercel.app

BREVO_API_KEY=your_brevo_api_key
ADMIN_EMAIL_ADDRESS=your_email@example.com
ADMIN_EMAIL_NAME=Trello Admin

ACCESS_TOKEN_SECRET_SIGNATURE=your_access_token_secret
ACCESS_TOKEN_LIFE=1h
REFRESH_TOKEN_SECRET_SIGNATURE=your_refresh_token_secret
REFRESH_TOKEN_LIFE=14d

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Khởi chạy máy chủ:
```bash
# Chạy ở chế độ phát triển (Development với Nodemon & Babel)
npm run dev

# Build mã nguồn cho môi trường Production
npm run build

# Chạy bản build Production
npm run start
```

---

## 👨‍💻 Tác Giả (Author)

- **Nguyễn Duy Cường** (*duycuongdev*)
- **GitHub**: [@duycuongdev](https://github.com/duycuongdev)
