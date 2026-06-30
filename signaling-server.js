const WebSocket = require('ws');
const http = require('http');

// HTTP server for health checks (required by Railway/Render)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});

const wss = new WebSocket.Server({ server });
const rooms = new Map(); // roomId -> Set of WebSocket clients

wss.on('connection', (ws) => {
  let userRoom = null;

  const sendError = (message) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message }));
    }
  };

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      sendError('Invalid JSON format');
      return;
    }

    if (data.type === 'join') {
      if (!data.room) {
        sendError('Room ID required');
        return;
      }

      // Leave previous room if joining a new one
      if (userRoom && rooms.has(userRoom)) {
        rooms.get(userRoom).delete(ws);
        if (rooms.get(userRoom).size === 0) rooms.delete(userRoom);
      }

      // Join new room
      userRoom = data.room;
      if (!rooms.has(userRoom)) rooms.set(userRoom, new Set());
      rooms.get(userRoom).add(ws);

      const roomSize = rooms.get(userRoom).size;
      console.log(`Client joined room: ${userRoom} (${roomSize}/2)`);

      if (roomSize === 1) {
        // First client becomes the initiator
        ws.send(JSON.stringify({ type: 'joined', role: 'initiator' }));
      } else if (roomSize === 2) {
        // Second client is the receiver
        ws.send(JSON.stringify({ type: 'joined', role: 'receiver' }));
        // Tell the first client their peer has arrived, so they create the offer
        rooms.get(userRoom).forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer_joined' }));
          }
        });
      } else {
        sendError('Room is full (max 2 peers)');
        rooms.get(userRoom).delete(ws);
      }
      return;
    }

    // Broadcast signaling messages (offer/answer/ice) to the other peer in the room
    if (userRoom && rooms.has(userRoom)) {
      const roomClients = rooms.get(userRoom);
      roomClients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    } else {
      sendError('Not in a room');
    }
  });

  ws.on('close', () => {
    if (userRoom && rooms.has(userRoom)) {
      const roomClients = rooms.get(userRoom);
      roomClients.delete(ws);
      if (roomClients.size === 0) rooms.delete(userRoom);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server started on port ${PORT}`);
});
