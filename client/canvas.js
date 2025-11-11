// client/canvas.js

/**
 * Manages all drawing operations on the HTML <canvas> element.
 * It handles local drawing, remote drawing, and full history redraws.
 */
export class CanvasApp {
  // The constructor is called when we do 'new CanvasApp(canvasEl)'
  constructor(canvasElement) {
    this.canvas = canvasElement;
    // Get the 2D rendering context, which is the API we use to draw.
    this.ctx = canvasElement.getContext('2d'); 
    
    // Flag to track if the user is currently pressing the mouse and drawing.
    this.isDrawing = false; 
    this.lastPoint = null; // Stores the last point in a stroke for smoothing.

    // Stores drawing state (color, width) for *other* users.
    // Keyed by socket.id.
    this.remoteDrawers = {}; 
    
    // Set the canvas to full-screen on initialization.
    this.resizeCanvas(); 
  }

  /**
   * Resizes the canvas to fill the entire browser window.
   */
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Note: Resizing the canvas *clears* all its content.
    // The main.js file is responsible for triggering a redraw after this.
  }

  /**
   * Converts screen coordinates (e.g., e.clientX) to canvas-relative coordinates.
   * Since our canvas is at (0,0) and fills the screen, this is a simple 1:1 mapping.
   */
  getCanvasCoordinates(clientX, clientY) {
    return {
      x: clientX,
      y: clientY
    };
  }

  // --- Local User Drawing (Our own mouse) ---

  /**
   * Begins a new drawing path for the local user.
   * @param {object} strokeData - Contains { color, width, mode, point }
   */
  startDrawing(strokeData) {
    this.isDrawing = true;
    this.ctx.beginPath(); // Start a new path
    this.ctx.moveTo(strokeData.point.x, strokeData.point.y); // Move to the starting point
    
    // Apply all the tool settings from the app state
    this.ctx.strokeStyle = strokeData.color;
    this.ctx.lineWidth = strokeData.width;
    this.ctx.globalCompositeOperation = strokeData.mode; // 'source-over' or 'destination-out'
    this.ctx.lineCap = 'round'; // Makes line ends rounded
    this.ctx.lineJoin = 'round'; // Makes line corners rounded

    this.lastPoint = strokeData.point;
  }

  /**
   * Draws the next segment of the local user's path.
   * @param {object} point - Contains { x, y }
   */
  draw(point) {
    if (!this.isDrawing) return; // Only draw if mouse is down

    this.ctx.lineTo(point.x, point.y); // Draw a line from the last point to this new one
    this.ctx.stroke(); // Render the line on the canvas

    this.lastPoint = point;
  }

  /**
   * Finishes the current drawing path for the local user.
   */
  stopDrawing() {
    this.isDrawing = false;
    this.ctx.closePath(); // Complete the path
    this.lastPoint = null;
  }

  // --- Remote User Drawing (Other users' strokes) ---

  /**
   * Begins drawing a path for a *remote* user.
   * @param {string} userId - The socket.id of the remote user
   * @param {object} strokeData - The stroke data broadcast from the server
   */
  startRemoteDrawing(userId, strokeData) {
    // Store this remote user's settings (color, width)
    this.remoteDrawers[userId] = {
      color: strokeData.color,
      width: strokeData.width,
      mode: strokeData.mode,
      lastPoint: strokeData.path[0]
    };
    
    // Start drawing *their* stroke on *our* canvas
    this.ctx.beginPath();
    this.ctx.moveTo(strokeData.path[0].x, strokeData.path[0].y);
    
    // Apply *their* tool settings
    this.ctx.strokeStyle = strokeData.color;
    this.ctx.lineWidth = strokeData.width;
    this.ctx.globalCompositeOperation = strokeData.mode;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  /**
   * Draws the next segment of a *remote* user's path.
   * @param {string} userId - The socket.id of the remote user
   * @param {object} point - The next point in their path
   */
  drawRemote(userId, point) {
    const drawer = this.remoteDrawers[userId];
    if (!drawer) return; // Safety check

    this.ctx.lineTo(point.x, point.y); // Draw a line to the new point
    this.ctx.stroke(); // Render it

    drawer.lastPoint = point;
  }
  
  // --- Global State Redraw ---
  
  /**
   * Clears the entire canvas and redraws it from the master history array.
   * This is the "nuke and pave" approach to ensure sync.
   * @param {Array} history - The entire `operationHistory` from the server.
   */
  redrawFromHistory(history) {
    // 1. Clear the canvas completely
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Loop through every operation in history and replay it
    history.forEach(op => {
      this.drawOperation(op);
    });
  }

  /**
   * A helper function that draws a single, complete operation object.
   * @param {object} op - A "stroke" object from the `operationHistory`
   */
  drawOperation(op) {
    // Safety check for valid stroke operations
    if (op.type !== 'stroke' || !op.path || op.path.length === 0) {
      return;
    }

    this.ctx.beginPath();
    
    // Set the properties for this specific stroke
    this.ctx.strokeStyle = op.color;
    this.ctx.lineWidth = op.width;
    this.ctx.globalCompositeOperation = op.mode;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Move to the first point of the path
    this.ctx.moveTo(op.path[0].x, op.path[0].y);
    
    // Draw lines to all subsequent points
    for (let i = 1; i < op.path.length; i++) {
      this.ctx.lineTo(op.path[i].x, op.path[i].y);
    }
    
    // Render the full path
    this.ctx.stroke(); 
    this.ctx.closePath();
    
    // IMPORTANT: Reset composite operation to default
    this.ctx.globalCompositeOperation = 'source-over'; 
  }
}