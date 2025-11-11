// client/main.js
import { CanvasApp } from './canvas.js';
import { WebSocketClient } from './websocket.js';

// --- Global App State ---
const appState = {
  color: '#000000',
  width: 5,
  mode: 'source-over' // 'source-over' = brush, 'destination-out' = eraser
};

// --- DOM Elements ---
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
const customCursor = document.getElementById('custom-cursor'); // Our custom cursor

// --- Initialization ---
const canvasApp = new CanvasApp(canvasEl);
const wsClient = new WebSocketClient(window.location.origin); // Connect to the server that served the page

// Set initial tool as active
brushBtn.classList.add('active');

// --- Event Listeners ---

// Tool Selection
colorInput.addEventListener('input', (e) => {
  appState.color = e.target.value;
});

widthInput.addEventListener('input', (e) => {
  appState.width = e.target.value;
  widthValue.textContent = e.target.value;
  
  // Update our custom cursor size
  customCursor.style.width = `${e.target.value}px`;
  customCursor.style.height = `${e.target.value}px`;
});

brushBtn.addEventListener('click', () => {
  appState.mode = 'source-over';
  brushBtn.classList.add('active');
  eraserBtn.classList.remove('active');
  
  // Change cursor to brush style
  customCursor.classList.remove('eraser');
});

eraserBtn.addEventListener('click', () => {
  appState.mode = 'destination-out';
  eraserBtn.classList.add('active');
  brushBtn.classList.remove('active');
  
  // Change cursor to eraser style
  customCursor.classList.add('eraser');
});

// Canvas Drawing Events
canvasEl.addEventListener('mousedown', (e) => {
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY);
  const strokeData = { ...appState, point };
  
  canvasApp.startDrawing(strokeData); // Local drawing
  wsClient.startStroke(strokeData);   // Send to server
});

canvasEl.addEventListener('mousemove', (e) => {
  // Move our custom cursor
  customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY);

  if (canvasApp.isDrawing) {
    canvasApp.draw(point);    // Local drawing
    wsClient.drawStroke(point); // Send to server
  }
  
  // Send *other* users our cursor position
  wsClient.moveCursor(point);
});

canvasEl.addEventListener('mouseup', () => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Local
    wsClient.endStroke();       // Send to server
  }
});

canvasEl.addEventListener('mouseout', () => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Local
    wsClient.endStroke();       // Send to server
  }
  // Hide custom cursor when leaving canvas
  customCursor.style.display = 'none';
});

canvasEl.addEventListener('mouseenter', (e) => {
  // Show custom cursor when entering canvas
  customCursor.style.display = 'block';
  
  // Set initial size and position
  const currentWidth = widthInput.value;
  customCursor.style.width = `${currentWidth}px`;
  customCursor.style.height = `${currentWidth}px`;
  customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});


// Undo/Redo
undoBtn.addEventListener('click', () => wsClient.requestUndo());
redoBtn.addEventListener('click', () => wsClient.requestRedo());


// --- WebSocket Event Handlers ---
wsClient.onConnect(() => {
  console.log('Connected to server!');
});

wsClient.onInitialState((history) => {
  console.log('Received initial canvas state');
  canvasApp.redrawFromHistory(history);
});

wsClient.onUserListUpdate((users) => {
  console.log('User list updated', users);
  userListEl.innerHTML = ''; // Clear list
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
  canvasApp.redrawFromHistory(history);
  // Re-set canvas settings as redraw clears them
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
  
  // Position the cursor relative to the window, not the canvas
  cursorEl.style.transform = `translate(${data.x}px, ${data.y}px)`;
});

wsClient.onUserDisconnected((id) => {
  const cursorEl = document.getElementById(`cursor-${id}`);
  if (cursorEl) {
    cursorEl.remove();
  }
});

// Handle window resizing
window.addEventListener('resize', () => {
  canvasApp.resizeCanvas();
  // On resize, the canvas is cleared, so we must redraw from history
  wsClient.socket.emit('request-history-redraw'); // We need to ask for a redraw
  // A simpler way (if the server doesn't have this event):
  // You would need to store the history locally and call
  // canvasApp.redrawFromHistory(localHistory);
});

// Add a handler for the server to force a redraw (like on resize)
wsClient.socket.on('force-redraw', (history) => {
    canvasApp.redrawFromHistory(history);
});

// Add this to server.js in the connection block:
// socket.on('request-history-redraw', () => {
//   socket.emit('force-redraw', operationHistory);
// });
// For now, we'll just redraw from a blank slate.
// The next global undo will fix it.
canvasApp.resizeCanvas(); // Initial size