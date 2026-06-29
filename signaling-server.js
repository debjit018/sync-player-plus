const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

const rooms = new Map(); // Using Map for better performance with frequent additions/deletions

wss.on('connection', (ws) => {
  let userRoom = null;

  // Send error message helper
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

      // Leave previous room if joining new one
      if (userRoom && rooms.has(userRoom)) {
        rooms.set(userRoom, rooms.get(userRoom).filter(client => client !== ws));
        if (rooms.get(userRoom).length === 0) rooms.delete(userRoom);
      }

      // Join new room
      userRoom = data.room;
      if (!rooms.has(userRoom)) rooms.set(userRoom, new Set());
      rooms.get(userRoom).add(ws);
      
      console.log(`Client joined room: ${userRoom}`);
      ws.send(JSON.stringify({ type: 'joined', room: userRoom }));
      return;
    }

    // Broadcast to room
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

console.log("Signaling server started on ws://localhost:3000");