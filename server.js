const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos da pasta 'public' (seu HTML)
app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  // Criar sala (Host)
  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomId] = { host: socket.id, client: null };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  // Entrar na sala (Visitante)
  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId] && !rooms[roomId].client) {
      rooms[roomId].client = socket.id;
      socket.join(roomId);
      socket.emit('joinedRoom', roomId);
      // Avisa o host que o jogo pode começar
      io.to(rooms[roomId].host).emit('playerJoined');
    } else {
      socket.emit('errorMsg', 'Sala cheia ou ID incorreto!');
    }
  });

  // Host envia o estado do jogo para o Cliente
  socket.on('syncGame', (data) => {
    socket.broadcast.to(data.room).emit('syncGame', data);
  });

  // Cliente envia a posição da raquete para o Host
  socket.on('syncPlayer', (data) => {
    socket.broadcast.to(data.room).emit('syncPlayer', data);
  });

  // Quando alguém sai
  socket.on('disconnect', () => {
    // Busca se o jogador estava em alguma sala e avisa o outro
    for (let roomId in rooms) {
      if (rooms[roomId].host === socket.id || rooms[roomId].client === socket.id) {
        socket.broadcast.to(roomId).emit('errorMsg', 'O outro jogador desconectou.');
        delete rooms[roomId]; // Apaga a sala
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});