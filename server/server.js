// server/server.js

// --- 1. Imports ---
// Import 'express' for creating the web server
const express = require('express'); 
// Import 'http' to create an HTTP server (which Express uses)
const http = require('http'); 
// Import 'path' for working with file and directory paths
const path = require('path'); 
// Import 'Server' class from 'socket.io' for WebSocket functionality
const { Server } = require('socket.io'); 

// --- 2. Server & App Initialization ---
// Create an Express application
const app = express(); 
// Create an HTTP server using the Express app
const server = http.createServer(app); 
// Initialize a new Socket.io server instance, attaching it to the HTTP server
const io = new Server(server); 

// Define the port. Use the environment's port (for deployment) or default to 3000
const PORT = process.env.PORT || 3000;

// --- 3. Server-Side State Management ---
// This array stores the "truth" of the canvas. Every completed stroke is an object here.
let operationHistory = []; 
// This array stores undone operations, allowing for a "redo" feature.
let redoStack = []; 
// This object stores information about currently connected users (e.g., color)
let activeUsers = {}; 
// This object temporarily stores strokes that are in-progress
let activeStrokes = {}; 

// --- 4. Express Server Setup ---
// Define the path to the 'client' folder. 
// Note: This path is relative to where the server.js file is.
const clientPath = path.join(__dirname, '..', 'client'); 
// Tell Express to serve static files (like style.css, main.js) from the 'client' folder
app.use(express.static(clientPath)); 

// Define a route for the root URL ('/')
app.get('/', (req, res) => {
  // Send the 'index.html' file as the response
  res.sendFile(path.join(clientPath, 'index.html')); 
});

// --- 5. Socket.io Connection Handling ---
// This runs every time a new client connects to the server
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // --- New User Setup ---
  // Create a unique color for the user
  const userColor = `hsl(${Math.random() * 360}, 100%, 70%)`; 
  // Store the new user's data
  activeUsers[socket.id] = { id: socket.id, color: userColor }; 

  // 1. Send the entire drawing history to *only* the new user
  socket.emit('initial-canvas-state', operationHistory); 

  // 2. Send the current list of all active users to *only* the new user
  socket.emit('user-list-update', Object.values(activeUsers)); 

  // 3. Send the updated user list to *all other* connected clients
  socket.broadcast.emit('user-list-update', Object.values(activeUsers)); 

  // --- 6. Drawing Event Listeners ---
  
  // Fired when a user presses their mouse down
  socket.on('start-stroke', (data) => {
    // Store the new stroke in 'activeStrokes' using the user's socket ID as the key
    activeStrokes[socket.id] = {
      type: 'stroke',
      user: socket.id,
      color: data.color,
      width: data.width,
      mode: data.mode,
      path: [data.point] // Initialize the path with the first point
    };
    // Broadcast to *all other* clients that this user has started a stroke
    socket.broadcast.emit('stroke-started', { ...activeStrokes[socket.id], user: socket.id });
  });

  // Fired when a user moves their mouse while drawing
  socket.on('draw-stroke', (data) => {
    // Find the user's active stroke
    const stroke = activeStrokes[socket.id]; 
    if (stroke) {
      // Add the new point to the stroke's path
      stroke.path.push(data.point); 
      // Broadcast just the new point to *all other* clients
      socket.broadcast.emit('stroke-drawn', { user: socket.id, point: data.point }); 
    }
  });

  // Fired when a user lifts their mouse up
  socket.on('end-stroke', () => {
    // Find the user's active stroke
    const stroke = activeStrokes[socket.id]; 
    if (stroke) {
      // The stroke is complete. Push it onto the master history.
      operationHistory.push(stroke); 
      // A new action invalidates the redo stack. Clear it.
      redoStack = []; 
      // Delete the temporary stroke from 'activeStrokes'
      delete activeStrokes[socket.id]; 
    }
  });

  // --- 7. State Management Event Listeners ---

  // Fired when a client clicks "Undo"
  socket.on('request-undo', () => {
    if (operationHistory.length > 0) {
      // Remove the last operation from history
      const lastOp = operationHistory.pop(); 
      // Add it to the redo stack
      redoStack.push(lastOp); 
      
      // Broadcast the *entire* (newly shortened) history to *all* clients
      // This forces everyone to redraw and stay in sync.
      io.emit('global-redraw', operationHistory); 
    }
  });

  // Fired when a client clicks "Redo"
  socket.on('request-redo', () => {
    if (redoStack.length > 0) {
      // Remove the last operation from the redo stack
      const opToRedo = redoStack.pop(); 
      // Add it back to the main history
      operationHistory.push(opToRedo); 

      // Broadcast the *entire* (newly lengthened) history to *all* clients
      io.emit('global-redraw', operationHistory); 
    }
  });

  // --- 8. Cursor Event Listener ---
  // Fired on every mouse move (even when not drawing)
  socket.on('cursor-move', (data) => {
    // Broadcast the cursor position to *all other* clients
    socket.broadcast.emit('cursor-moved', { 
      id: socket.id, // Identify *which* user's cursor moved
      ...data
    });
  });

  // --- 9. Disconnect Event Listener ---
  // Fired when a client closes their browser or refreshes
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Clean up: remove user from active lists
    delete activeUsers[socket.id]; 
    delete activeStrokes[socket.id]; // Clear any unfinished strokes
    
    // Notify all clients of the updated user list
    io.emit('user-list-update', Object.values(activeUsers)); 
    
    // Notify all clients to remove this user's cursor from their screen
    io.emit('user-disconnected', socket.id); 
  });
});

// --- 10. Start Server ---
// Start the server, listening on the defined PORT and '0.0.0.0'
// '0.0.0.0' is crucial for deployment (like on Render) to accept external connections
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});