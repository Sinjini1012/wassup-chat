// Node server which will handle socket io connections
// index.js

const io = require('socket.io')(8000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = {};
const roomMessages = {};

io.on('connection', socket => {
  console.log("[SERVER] A new client connected:", socket.id);

  // User joins
  socket.on('new-user-joined', name => {
    users[socket.id] = { name, room: 'general' };
    socket.join('general');
    console.log(`[SERVER] ${name} joined general`);
    socket.emit('load-history', roomMessages['general'] || []);
    socket.broadcast.to('general').emit('user-joined', name);
    io.emit('user-list', getAllUsers());
  });

  // File sharing
  socket.on('file', data => {
    const user = users[socket.id];
    if (!user) return;
    const room = data.room || user.room;
    
    console.log(`[SERVER] ${user.name} sent file: ${data.fileName} to ${room}`);

    // store in room history
    if (!roomMessages[room]) roomMessages[room] = [];
    roomMessages[room].push({ name: user.name, message: `[file] ${data.fileName}` });
    if (roomMessages[room].length > 20) roomMessages[room].shift();
    // broadcast to others
    io.to(room).emit('file', {
      file: data.file,
      fileName: data.fileName,
      fileType: data.fileType,
      name: user.name
    });
  });

  // Room join
  socket.on('join-room', room => {
    const user = users[socket.id];
    if (user) {
      const oldRoom = user.room;
      socket.leave(oldRoom);
      socket.join(room);
      user.room = room;
      console.log(`[SERVER] ${user.name} switched from ${oldRoom} ➜ ${room}`);
      socket.emit('load-history', roomMessages[room] || []);
      socket.broadcast.to(room).emit('user-joined', user.name);
    }
  });

  // ✅ Public message
  socket.on('send', data => {
    const user = users[socket.id];
    if (!user) return;
    const message = typeof data === 'object' ? data.message : data;
    const room = (typeof data === 'object' && data.room) ? data.room : user.room;

    console.log(`[SERVER] ${user.name} sent to ${room}: ${message}`);

    if (!roomMessages[room]) roomMessages[room] = [];
    roomMessages[room].push({ name: user.name, message });
    if (roomMessages[room].length > 20) roomMessages[room].shift();

    // 🟢 emit to everyone else in the room
    socket.to(room).emit('receive', { message, name: user.name });
  });

  // Private message
  socket.on('private-message', ({ targetId, message }) => {
    const sender = users[socket.id];
    if (!sender) return;
    console.log(`[SERVER] Private from ${sender.name} to ${targetId}: ${message}`);
    io.to(targetId).emit('private-receive', { message, name: sender.name, from: socket.id });
  });

  //disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`[SERVER] ${user.name} disconnected`);
      socket.broadcast.to(user.room).emit('left', user.name);
      delete users[socket.id];
      io.emit('user-list', getAllUsers());
    }
  });
});

function getAllUsers() {
  const list = [];
  for (const id in users) list.push({ id, name: users[id].name });
  return list;
}
