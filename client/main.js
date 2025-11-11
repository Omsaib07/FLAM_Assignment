// client/main.js

// Import the 'CanvasApp' class from its file. This class manages all <canvas> drawing.
import { CanvasApp } from './canvas.js'; 
// Import the 'WebSocketClient' class. This class manages all server communication.
import { WebSocketClient } from './websocket.js'; 

// --- 1. Global Client-Side State ---
// This object holds the user's current tool settings.
const appState = {
  color: '#000000',
  width: 5,
  mode: 'source-over' // 'source-over' = brush, 'destination-out' = eraser
};

// A local cache of the canvas history for instant redraws (e.g., on resize)
let localOperationHistory = [];
// This locks the drawing input to 'mouse' or 'touch' to prevent conflicts.
let drawingInput = null;

// --- 2. DOM Element Selection ---
const canvasEl = document.getElementById('drawing-canvas');
const colorInput = document.getElementById('color');
const widthInput = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const brushBtn = document.getElementById('brush');
const eraserBtn = document.getElementById('eraser');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const userListEl = document.getElementById('users');
const cursorOverlay = document.getElementById('cursor-overlay');
const customCursor = document.getElementById('custom-cursor'); // Our "fake" cursor div

// --- 3. Initialization ---

// Get a room name from the URL, like "http://.../room-name"
// If no room, default to "main-lobby"
// .replace(/\/$/, "") handles trailing slashes (e.g. /my-room/ -> my-room)
const roomName = window.location.pathname.substring(1).replace(/\/$/, "") || 'main-lobby';

// Create new instances of our app and websocket client
const canvasApp = new CanvasApp(canvasEl);
const wsClient = new WebSocketClient(window.location.origin);

// Set the brush as the default active tool on load.
brushBtn.classList.add('active');

// --- 4. Toolbar Event Listeners ---

colorInput.addEventListener('input', (e) => {
  appState.color = e.target.value;
});

widthInput.addEventListener('input', (e) => {
  appState.width = e.target.value; 
  widthValue.textContent = e.target.value; 
  
  // Update the size of our custom "fake" cursor.
  const newWidth = `${e.target.value}px`;
  customCursor.style.width = newWidth;
  customCursor.style.height = newWidth;
});

brushBtn.addEventListener('click', () => {
  appState.mode = 'source-over'; // Set mode to "draw"
  brushBtn.classList.add('active');
  eraserBtn.classList.remove('active');
  customCursor.classList.remove('eraser'); 
});

eraserBtn.addEventListener('click', () => {
  appState.mode = 'destination-out'; // Set mode to "erase"
  eraserBtn.classList.add('active');
  brushBtn.classList.remove('active');
  customCursor.classList.add('eraser'); 
});

undoBtn.addEventListener('click', () => wsClient.requestUndo());
redoBtn.addEventListener('click', () => wsClient.requestRedo());

// --- 5. Mouse Event Listeners ---

canvasEl.addEventListener('mousedown', (e) => {
  if (drawingInput) return; // Exit if already drawing (e.g., with touch)
  drawingInput = 'mouse';     // Lock input to mouse
  
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY); 
  const strokeData = { ...appState, point }; 
  
  canvasApp.startDrawing(strokeData);
  wsClient.startStroke(strokeData);
});

canvasEl.addEventListener('mousemove', (e) => {
  customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; 
  
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY);

  // Only draw if the 'mouse' is the locked input
  if (canvasApp.isDrawing && drawingInput === 'mouse') {
    canvasApp.draw(point);
    wsClient.drawStroke(point);
  }
  
  wsClient.moveCursor(point); 
});

canvasEl.addEventListener('mouseup', () => {
  // Only stop drawing if 'mouse' was the locked input
  if (canvasApp.isDrawing && drawingInput === 'mouse') {
    drawingInput = null; // Release the lock
    canvasApp.stopDrawing();
    wsClient.endStroke();
  }
});

canvasEl.addEventListener('mouseout', () => {
  // Only stop drawing if 'mouse' was the locked input
  if (canvasApp.isDrawing && drawingInput === 'mouse') {
    drawingInput = null; // Release the lock
    canvasApp.stopDrawing(); 
    wsClient.endStroke(); 
  }
  customCursor.style.display = 'none'; 
});

canvasEl.addEventListener('mouseenter', (e) => {
  customCursor.style.display = 'block'; 
  
  const currentWidth = widthInput.value;
  customCursor.style.width = `${currentWidth}px`;
  customCursor.style.height = `${currentWidth}px`;
  customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});

// --- 6. Touch Event Listeners ---

// Helper function to get the touch position
function getTouchPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { 
      clientX: e.touches[0].clientX, 
      clientY: e.touches[0].clientY 
    };
  }
  return null;
}

canvasEl.addEventListener('touchstart', (e) => {
  e.preventDefault(); 
  if (drawingInput) return; // Exit if already drawing (e.g., with mouse)

  const pos = getTouchPos(e);
  if (!pos) return;

  drawingInput = 'touch'; // Lock input to touch

  const point = canvasApp.getCanvasCoordinates(pos.clientX, pos.clientY);
  const strokeData = { ...appState, point };
  
  canvasApp.startDrawing(strokeData);
  wsClient.startStroke(strokeData);
}, { passive: false }); // Need passive:false to allow preventDefault

canvasEl.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const pos = getTouchPos(e);
  if (!pos) return;

  customCursor.style.transform = `translate(${pos.clientX}px, ${pos.clientY}px)`;
  
  const point = canvasApp.getCanvasCoordinates(pos.clientX, pos.clientY);

  // Only draw if 'touch' is the locked input
  if (canvasApp.isDrawing && drawingInput === 'touch') {
    canvasApp.draw(point);
    wsClient.drawStroke(point);
  }
  
  wsClient.moveCursor(point);
}, { passive: false }); // Need passive:false to allow preventDefault

canvasEl.addEventListener('touchend', (e) => {
  // Only stop drawing if 'touch' was the locked input
  if (canvasApp.isDrawing && drawingInput === 'touch') {
    drawingInput = null; // Release the lock
    canvasApp.stopDrawing();
    wsClient.endStroke();
  }
});

canvasEl.addEventListener('touchcancel', (e) => {
  // Only stop drawing if 'touch' was the locked input
  if (canvasApp.isDrawing && drawingInput === 'touch') {
    drawingInput = null; // Release the lock
    canvasApp.stopDrawing();
    wsClient.endStroke();
  }
});

// --- 7. WebSocket Event Handlers (Receiving from Server) ---

wsClient.onConnect(() => {
  console.log('Connected to server!');
  // Tell the server which room we want to join
  wsClient.socket.emit('join-room', roomName);
});

wsClient.onInitialState((history) => {
  console.log('Received initial canvas state');
  localOperationHistory = history; // Cache the history locally
  canvasApp.redrawFromHistory(history); 
});

wsClient.onUserListUpdate((users) => {
  console.log('User list updated', users);
  userListEl.innerHTML = ''; // Clear the old list
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="user-color-swatch" style="background-color: ${user.color}"></span>
      ${user.id.substring(0, 6)} ${user.id === wsClient.socket.id ? '(You)' : ''}
    `;
    userListEl.appendChild(li);
  });
});

wsClient.onStrokeStarted((data) => {
  canvasApp.startRemoteDrawing(data.user, data); 
});

wsClient.onStrokeDrawn((data) => {
  canvasApp.drawRemote(data.user, data.point); 
});

wsClient.onGlobalRedraw((history) => {
  console.log('Received global redraw command');
  localOperationHistory = history; // Re-cache the history
  canvasApp.redrawFromHistory(history); 
  // Re-set our local tool, as redrawFromHistory may have reset it.
  canvasApp.ctx.globalCompositeOperation = appState.mode; 
});

wsClient.onCursorMoved((data) => {
  let cursorEl = document.getElementById(`cursor-${data.id}`); 
  if (!cursorEl) {
    const user = wsClient.users[data.id];
    cursorEl = document.createElement('div');
    cursorEl.id = `cursor-${data.id}`;
    cursorEl.className = 'user-cursor';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'user-cursor-label';
    labelEl.textContent = data.id.substring(0, 6);
    labelEl.style.backgroundColor = user ? user.color : '#888';
    
    cursorEl.appendChild(labelEl);
    cursorOverlay.appendChild(cursorEl);
  }
  
  cursorEl.style.transform = `translate(${data.x}px, ${data.y}px)`; 
});

wsClient.onUserDisconnected((id) => {
  const cursorEl = document.getElementById(`cursor-${id}`); 
  if (cursorEl) {
    cursorEl.remove(); 
  }
});

// --- 8. Window Resize Handler ---

window.addEventListener('resize', () => {
  canvasApp.resizeCanvas(); // Resize the canvas element
  // Resizing clears the canvas, so we redraw from our local cache.
  // This is instant and requires no server call.
  canvasApp.redrawFromHistory(localOperationHistory);
});

// Perform an initial resize to set the canvas to full screen.
canvasApp.resizeCanvas();