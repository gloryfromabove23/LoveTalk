const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup storage for profile pics
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Simple in-memory user accounts for prototype
let users = {}; // { socketId: { name, picture } }

app.post('/upload', upload.single('picture'), (req, res) => {
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createUser', ({ name, picture }) => {
    users[socket.id] = { name, picture };
    io.emit('updateUsers', Object.values(users));
  });

  socket.on('chatMessage', ({ msg }) => {
    const user = users[socket.id];
    if(user) io.emit('message', { name: user.name, msg });
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('updateUsers', Object.values(users));
  });
});

server.listen(3000, () => console.log('LoveTalk running on http://localhost:3000'));
