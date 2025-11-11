// server/server.js

// --- 1. Imports ---
const express = require('express'); 
const http = require('http'); 
const path = require('path'); 
const { Server } = require('socket.io'); 

// --- 2. Server & App Initialization ---
const app = express(); 
const server = http.createServer(app); 
const io = new Server(server); 

const PORT = process.env.PORT || 3000;

// --- 3. Server-Side State Management ---
let rooms = {}; // Stores state for all rooms

// Helper function to get or create a room's state
function getRoomState(roomName) {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      operationHistory: [],
      redoStack: [],
      activeStrokes: {},
      activeUsers: {}
    };
  }
  return rooms[roomName];
}

// --- DELETED ---
// The global state variables are no longer needed.
// let activeUsers = {}; 
// let activeStrokes = {}; 

// --- 4. Express Server Setup ---
// Use the more robust 'process.cwd()' for deployment
const clientPath = path.join(process.cwd(), 'client'); 
app.use(express.static(clientPath)); 

app.get('/*', (req, res) => { // Use /* to catch all routes
  // Send the 'index.html' file, which will handle its own room logic
  res.sendFile(path.join(clientPath, 'index.html')); 
});

// --- 5. Socket.io Connection Handling ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Wait for the client to tell us which room to join
  socket.on('join-room', (roomName) => {
    
    // 1. Have the socket join the Socket.io room
    socket.join(roomName); 
    console.log(`User ${socket.id} joined room ${roomName}`);

    // 2. Get the state for this specific room
    const roomState = getRoomState(roomName);

    // --- 3. New User Setup (MOVED & MODIFIED) ---
    const userColor = `hsl(${Math.random() * 360}, 100%, 70%)`; 
    // Add user to the ROOM's state
    roomState.activeUsers[socket.id] = { id: socket.id, color: userColor }; 

    // 1. Send THIS ROOM's history to *only* the new user
    socket.emit('initial-canvas-state', roomState.operationHistory); 

    // 2. Send THIS ROOM's user list to *only* the new user
    socket.emit('user-list-update', Object.values(roomState.activeUsers)); 

    // 3. Send updated user list to *all other* clients in THIS ROOM
    socket.broadcast.to(roomName).emit('user-list-update', Object.values(roomState.activeUsers)); 

    // --- 6. Drawing Event Listeners (MOVED & MODIFIED) ---
    
    socket.on('start-stroke', (data) => {
      // Use the ROOM'S state
      roomState.activeStrokes[socket.id] = {
        type: 'stroke',
        user: socket.id,
        color: data.color,
        width: data.width,
        mode: data.mode,
        path: [data.point]
      };
      // Broadcast to *all others* in THIS ROOM
      socket.broadcast.to(roomName).emit('stroke-started', { ...roomState.activeStrokes[socket.id], user: socket.id });
    });

    socket.on('draw-stroke', (data) => {
      const stroke = roomState.activeStrokes[socket.id]; 
      if (stroke) {
        stroke.path.push(data.point); 
        // Broadcast to *all others* in THIS ROOM
        socket.broadcast.to(roomName).emit('stroke-drawn', { user: socket.id, point: data.point }); 
      }
    });

    socket.on('end-stroke', () => {
      const stroke = roomState.activeStrokes[socket.id]; 
      if (stroke) {
        // Add to THIS ROOM'S history
        roomState.operationHistory.push(stroke); 
        roomState.redoStack = []; 
        delete roomState.activeStrokes[socket.id]; 
      }
    });

    // --- 7. State Management Event Listeners (MOVED & MODIFIED) ---

    socket.on('request-undo', () => {
      // Use THIS ROOM'S state
      if (roomState.operationHistory.length > 0) {
        const lastOp = roomState.operationHistory.pop(); 
        roomState.redoStack.push(lastOp); 
        
        // Broadcast to *everyone* in THIS ROOM
        io.to(roomName).emit('global-redraw', roomState.operationHistory); 
      }
    });

    socket.on('request-redo', () => {
      // Use THIS ROOM'S state
      if (roomState.redoStack.length > 0) {
        const opToRedo = roomState.redoStack.pop(); 
        roomState.operationHistory.push(opToRedo); 

        // Broadcast to *everyone* in THIS ROOM
        io.to(roomName).emit('global-redraw', roomState.operationHistory); 
      }
    });

    // --- 8. Cursor Event Listener (MOVED & MODIFIED) ---
    socket.on('cursor-move', (data) => {
      // Broadcast to *all others* in THIS ROOM
      socket.broadcast.to(roomName).emit('cursor-moved', { 
        id: socket.id,
        ...data
      });
    });

    // --- 9. Disconnect Event Listener (MOVED & MODIFIED) ---
    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected from room ${roomName}`);
      
      // Clean up from THIS ROOM'S state
      delete roomState.activeUsers[socket.id]; 
      delete roomState.activeStrokes[socket.id]; 
      
      // Notify *all others* in THIS ROOM
      io.to(roomName).emit('user-list-update', Object.values(roomState.activeUsers)); 
      io.to(roomName).emit('user-disconnected', socket.id); 
    });
  }); // --- End of 'join-room' listener ---
}); // --- End of 'connection' listener ---

// --- 10. Start Server ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});