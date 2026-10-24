export const inviteUserToBoardSocket = (socket) => {
  // Lắng nghe sự kiện client đăng ký phòng cá nhân theo userId
  socket.on('FE_USER_JOIN_ROOM', (userId) => {
    if (userId) {
      socket.join(userId.toString())
    }
  })

  socket.on('FE_USER_INVITED_TO_BOARD', (invitation) => {
    // Chỉ gửi thông báo tới đúng room của người được mời (inviteeId), tránh rò rỉ dữ liệu ra toàn hệ thống
    if (invitation?.inviteeId) {
      socket.to(invitation.inviteeId.toString()).emit('BE_USER_INVITED_TO_BOARD', invitation)
    }
  })
}
