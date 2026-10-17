export const inviteUserToBoardSocket = (socket) => {
  socket.on('FE_USER_INVITED_TO_BOARD', (invitation) => {
    // emit to all connected clients except the sender
    socket.broadcast.emit('BE_USER_INVITED_TO_BOARD', invitation)
  })
}


