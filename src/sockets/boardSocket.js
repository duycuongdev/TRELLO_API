/**
 * Quản lý Socket.io cho tính năng Real-time Board Collaboration
 * - Quản lý phòng (Room) theo từng board: board_{boardId}
 * - Theo dõi danh sách thành viên đang trực tuyến xem bảng (Active Viewers)
 * - Broadcast các thao tác thay đổi bảng (kéo thả column, kéo thả card, tạo/sửa/xóa card, v.v.)
 */

// Lưu trữ người dùng đang online theo từng Board: Map<boardId, Map<socketId, user>>
const activeBoardUsers = new Map()

const getUniqueOnlineUsers = (boardId) => {
  if (!activeBoardUsers.has(boardId)) return []
  const userMap = activeBoardUsers.get(boardId)
  const uniqueUsers = new Map()
  userMap.forEach((user) => {
    if (user && user._id) {
      uniqueUsers.set(user._id.toString(), user)
    }
  })
  return Array.from(uniqueUsers.values())
}

const cleanupUserFromBoard = (socket, io, boardId) => {
  if (!boardId || !activeBoardUsers.has(boardId)) return

  const userMap = activeBoardUsers.get(boardId)
  userMap.delete(socket.id)

  const roomName = `board_${boardId}`
  if (userMap.size === 0) {
    activeBoardUsers.delete(boardId)
  } else {
    io.to(roomName).emit('BE_BOARD_USERS_ONLINE', getUniqueOnlineUsers(boardId))
  }
}

export const boardSocket = (socket, io) => {
  // Client tham gia vào phòng của một Board cụ thể
  socket.on('FE_USER_JOIN_BOARD_ROOM', ({ boardId, user }) => {
    if (!boardId) return

    const roomName = `board_${boardId}`
    socket.join(roomName)

    // Lưu thông tin vào socket instance để xử lý khi disconnect
    socket.boardId = boardId
    socket.boardUser = user

    if (!activeBoardUsers.has(boardId)) {
      activeBoardUsers.set(boardId, new Map())
    }

    if (user && user._id) {
      activeBoardUsers.get(boardId).set(socket.id, user)
    }

    // Gửi danh sách người dùng đang online trên bảng cho toàn bộ client trong phòng
    io.to(roomName).emit('BE_BOARD_USERS_ONLINE', getUniqueOnlineUsers(boardId))
  })

  // Client chủ động rời khỏi phòng của Board (ví dụ chuyển trang khác)
  socket.on('FE_USER_LEAVE_BOARD_ROOM', ({ boardId }) => {
    if (!boardId) return

    const roomName = `board_${boardId}`
    socket.leave(roomName)
    cleanupUserFromBoard(socket, io, boardId)

    socket.boardId = null
    socket.boardUser = null
  })

  // Broadcast các thao tác thay đổi dữ liệu của Board tới tất cả người dùng khác đang xem
  // data gồm: { boardId, actionType, payload, senderId, senderName }
  socket.on('FE_BOARD_UPDATED', (data) => {
    if (!data?.boardId) return

    const roomName = `board_${data.boardId}`
    // Phát sự kiện tới tất cả thành viên trong phòng ngoại trừ người gửi
    socket.to(roomName).emit('BE_BOARD_UPDATED', data)
  })

  // Xử lý khi socket ngắt kết nối bất ngờ (tắt tab, mất mạng)
  socket.on('disconnect', () => {
    if (socket.boardId) {
      cleanupUserFromBoard(socket, io, socket.boardId)
    }
  })
}
