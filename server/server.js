// server/server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- State Management ---
// We will move this to drawing-state.js later, but let's start simple.
let operationHistory = [];
let redoStack = [];
let activeUsers = {}; // Stores socket.id -> user info
let activeStrokes = {}; // Stores socket.id -> current stroke data

// --- Express Setup ---
// Serve the static files from the 'client' directory
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// --- Socket.io Connection ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Assign a color to the user
  const userColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
  activeUsers[socket.id] = { id: socket.id, color: userColor };

  // 1. Send the current history to the new user
  socket.emit('initial-canvas-state', operationHistory);

  // 2. Send the current user list to the new user
  socket.emit('user-list-update', Object.values(activeUsers));

  // 3. Notify all other users that a new user has joined
  socket.broadcast.emit('user-list-update', Object.values(activeUsers));

  // --- Drawing Events ---
  
  // A user starts a stroke
  socket.on('start-stroke', (data) => {
    // Store the beginning of the stroke
    activeStrokes[socket.id] = {
      type: 'stroke',
      user: socket.id,
      color: data.color,
      width: data.width,
      mode: data.mode,
      path: [data.point] // Start the path with the first point
    };
    // Broadcast to others that a stroke has started
    socket.broadcast.emit('stroke-started', { ...activeStrokes[socket.id], user: socket.id });
  });

  // A user is actively drawing
  socket.on('draw-stroke', (data) => {
    // Add the new point to the active stroke
    const stroke = activeStrokes[socket.id];
    if (stroke) {
      stroke.path.push(data.point);
      // Broadcast this point to other users
      socket.broadcast.emit('stroke-drawn', { user: socket.id, point: data.point });
    }
  });

  // A user finishes a stroke
  socket.on('end-stroke', () => {
    const stroke = activeStrokes[socket.id];
    if (stroke) {
      // Add the completed stroke to the master history
      operationHistory.push(stroke);
      // Clear the redo stack, as a new action has been taken
      redoStack = [];
      // No need to broadcast 'end' - the history push is the key
      delete activeStrokes[socket.id];
    }
  });

  // --- State Management Events ---

  // User requests an undo
  socket.on('request-undo', () => {
    if (operationHistory.length > 0) {
      const lastOp = operationHistory.pop();
      redoStack.push(lastOp);
      
      // Broadcast the new, shorter history to ALL clients for redraw
      io.emit('global-redraw', operationHistory);
    }
  });

  // User requests a redo
  socket.on('request-redo', () => {
    if (redoStack.length > 0) {
      const opToRedo = redoStack.pop();
      operationHistory.push(opToRedo);

      // Broadcast the new, longer history to ALL clients for redraw
      io.emit('global-redraw', operationHistory);
    }
  });

  // --- User Cursors ---
  socket.on('cursor-move', (data) => {
    socket.broadcast.emit('cursor-moved', {
      id: socket.id,
      ...data
    });
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete activeUsers[socket.id];
    delete activeStrokes[socket.id]; // Clear any unfinished strokes
    // Notify all users of the updated list
    io.emit('user-list-update', Object.values(activeUsers));
  });
});


server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});