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

// --- 2. DOM Element Selection ---
// Grab all the HTML elements we need to interact with.
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
// Create a new instance of our CanvasApp, passing it the <canvas> element.
const canvasApp = new CanvasApp(canvasEl); 
// Create a new instance of our WebSocketClient.
// 'window.location.origin' dynamically connects to the server that sent the page
// (e.g., 'http://localhost:3000' or 'https://drawing-app.onrender.com')
const wsClient = new WebSocketClient(window.location.origin); 

// Set the brush as the default active tool on load.
brushBtn.classList.add('active');

// --- 4. Toolbar Event Listeners ---

// When the color picker changes, update our appState.
colorInput.addEventListener('input', (e) => {
  appState.color = e.target.value;
});

// When the width slider changes...
widthInput.addEventListener('input', (e) => {
  // Update the appState.
  appState.width = e.target.value; 
  // Update the number label next to the slider.
  widthValue.textContent = e.target.value; 
  
  // Also update the size of our custom "fake" cursor.
  customCursor.style.width = `${e.target.value}px`;
  customCursor.style.height = `${e.target.value}px`;
});

// When the brush button is clicked...
brushBtn.addEventListener('click', () => {
  appState.mode = 'source-over'; // Set mode to "draw"
  brushBtn.classList.add('active'); // Highlight brush button
  eraserBtn.classList.remove('active'); // Un-highlight eraser
  
  // Change the custom cursor's style to the brush (a simple circle).
  customCursor.classList.remove('eraser'); 
});

// When the eraser button is clicked...
eraserBtn.addEventListener('click', () => {
  appState.mode = 'destination-out'; // Set mode to "erase"
  eraserBtn.classList.add('active'); // Highlight eraser button
  brushBtn.classList.remove('active'); // Un-highlight brush
  
  // Change the custom cursor's style to the eraser.
  customCursor.classList.add('eraser'); 
});

// --- 5. Canvas Drawing Event Listeners ---

// When the mouse is pressed down on the canvas...
canvasEl.addEventListener('mousedown', (e) => {
  // Get the x, y coordinates relative to the canvas.
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY); 
  // Package up all current tool settings with the starting point.
  const strokeData = { ...appState, point }; 
  
  canvasApp.startDrawing(strokeData); // Start drawing on our *local* canvas immediately.
  wsClient.startStroke(strokeData);   // Send the 'start-stroke' message to the server.
});

// When the mouse moves over the canvas...
canvasEl.addEventListener('mousemove', (e) => {
  // Move our custom "fake" cursor to match the real mouse position.
  customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; 
  
  const point = canvasApp.getCanvasCoordinates(e.clientX, e.clientY);

  // If we are in "drawing" mode (mouse is down)...
  if (canvasApp.isDrawing) {
    canvasApp.draw(point);    // Draw the next segment on our *local* canvas.
    wsClient.drawStroke(point); // Send the new point to the server.
  }
  
  // Always send our cursor position to the server for others to see.
  wsClient.moveCursor(point); 
});

// When the mouse is released...
canvasEl.addEventListener('mouseup', () => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Stop drawing locally.
    wsClient.endStroke();       // Tell the server the stroke is finished.
  }
});

// When the mouse leaves the canvas area...
canvasEl.addEventListener('mouseout', () => {
  if (canvasApp.isDrawing) {
    // If we were drawing and left, stop the stroke.
    canvasApp.stopDrawing(); 
    wsClient.endStroke(); 
  }
  // Hide the custom cursor so it doesn't get "stuck" at the edge.
  customCursor.style.display = 'none'; 
});

// When the mouse re-enters the canvas area...
canvasEl.addEventListener('mouseenter', (e) => {
  // Show the custom cursor.
  customCursor.style.display = 'block'; 
  
  // Set its size and position immediately, don't wait for a mousemove.
  const currentWidth = widthInput.value;
  customCursor.style.width = `${currentWidth}px`;
  customCursor.style.height = `${currentWidth}px`;
  customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
});
// --- Touch Event Listeners ---

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
  // Stop the page from scrolling
  e.preventDefault(); 
  const pos = getTouchPos(e);
  if (!pos) return;

  const point = canvasApp.getCanvasCoordinates(pos.clientX, pos.clientY);
  const strokeData = { ...appState, point };
  
  canvasApp.startDrawing(strokeData); // Local drawing
  wsClient.startStroke(strokeData);   // Send to server
}, { passive: false }); // Need passive:false to allow preventDefault

canvasEl.addEventListener('touchmove', (e) => {
  // Stop the page from scrolling
  e.preventDefault();
  const pos = getTouchPos(e);
  if (!pos) return;

  // Move our custom cursor
  customCursor.style.transform = `translate(${pos.clientX}px, ${pos.clientY}px)`;
  
  const point = canvasApp.getCanvasCoordinates(pos.clientX, pos.clientY);

  if (canvasApp.isDrawing) {
    canvasApp.draw(point);    // Local drawing
    wsClient.drawStroke(point); // Send to server
  }
  
  // Send *other* users our cursor position
  wsClient.moveCursor(point);
}, { passive: false }); // Need passive:false to allow preventDefault

canvasEl.addEventListener('touchend', (e) => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Local
    wsClient.endStroke();       // Send to server
  }
});

canvasEl.addEventListener('touchcancel', (e) => {
  if (canvasApp.isDrawing) {
    canvasApp.stopDrawing();    // Local
    wsClient.endStroke();       // Send to server
  }
});
// --- 6. Undo/Redo Event Listeners ---
undoBtn.addEventListener('click', () => wsClient.requestUndo());
redoBtn.addEventListener('click', () => wsClient.requestRedo());

// --- 7. WebSocket Event Handlers (Receiving from Server) ---

// When we successfully connect to the server.
wsClient.onConnect(() => {
  console.log('Connected to server!');
});

// When the server sends us the *initial* canvas state (on first connect).
wsClient.onInitialState((history) => {
  console.log('Received initial canvas state');
  // Redraw the entire canvas from the master history.
  canvasApp.redrawFromHistory(history); 
});

// When the server sends an updated list of users.
wsClient.onUserListUpdate((users) => {
  console.log('User list updated', users);
  userListEl.innerHTML = ''; // Clear the old list
  // Re-create the list from scratch
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="user-color-swatch" style="background-color: ${user.color}"></span>
      ${user.id.substring(0, 6)} ${user.id === wsClient.socket.id ? '(You)' : ''}
    `;
    userListEl.appendChild(li);
  });
});

// When *another* user starts a stroke.
wsClient.onStrokeStarted((data) => {
  // Begin drawing their stroke on our canvas.
  canvasApp.startRemoteDrawing(data.user, data); 
});

// When *another* user is drawing a stroke.
wsClient.onStrokeDrawn((data) => {
  // Continue drawing their stroke segment.
  canvasApp.drawRemote(data.user, data.point); 
});

// When *anyone* (including us) triggers an Undo or Redo.
wsClient.onGlobalRedraw((history) => {
  console.log('Received global redraw command');
  // The server has sent a new "truth". Clear and redraw everything.
  canvasApp.redrawFromHistory(history); 
  // Re-set our local tool, as redrawFromHistory may have reset it.
  canvasApp.ctx.globalCompositeOperation = appState.mode; 
});

// When *another* user moves their cursor.
wsClient.onCursorMoved((data) => {
  // Find the cursor element for that user.
  let cursorEl = document.getElementById(`cursor-${data.id}`); 
  if (!cursorEl) {
    // If it doesn't exist, create it.
    const user = wsClient.users[data.id]; // Get user data (like color) from our cache
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
  
  // Move the cursor element to its new position.
  cursorEl.style.transform = `translate(${data.x}px, ${data.y}px)`; 
});

// When the server tells us a user has disconnected.
wsClient.onUserDisconnected((id) => {
  // Find that user's cursor element.
  const cursorEl = document.getElementById(`cursor-${id}`); 
  if (cursorEl) {
    // Remove it from the screen.
    cursorEl.remove(); 
  }
});

// --- 8. Window Resize Handler ---
window.addEventListener('resize', () => {
  canvasApp.resizeCanvas(); // Resize the canvas element
  // Resizing clears the canvas, so we must redraw.
  // This asks the server for the history again.
  // A better way is to cache history locally (as done in later fixes).
  wsClient.socket.emit('request-history-redraw'); 
});

// This handler would be for the server's response to 'request-history-redraw'
wsClient.socket.on('force-redraw', (history) => {
    canvasApp.redrawFromHistory(history);
});

// Perform an initial resize to set the canvas to full screen.
canvasApp.resizeCanvas();