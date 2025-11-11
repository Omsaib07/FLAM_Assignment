// client/canvas.js
export class CanvasApp {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    this.isDrawing = false;
    this.lastPoint = null;

    // This stores drawing state for *other* users
    this.remoteDrawers = {}; // e.g., { 'user-id-123': { ctx.strokeStyle: ..., ctx.lineWidth: ... } }
    
    this.resizeCanvas();
  }

  resizeCanvas() {
    // We need to subtract the toolbar height
    const toolbarHeight = 50;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - toolbarHeight;
    this.canvas.style.top = `${toolbarHeight}px`;

    // Note: Resizing clears the canvas. We'll need to redraw.
    // In a real app, we'd request the history again or redraw from a local copy.
    // For now, we'll let the next 'global-redraw' fix it.
  }

  getCanvasCoordinates(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  // --- Local User Drawing ---

  startDrawing(strokeData) {
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(strokeData.point.x, strokeData.point.y);
    
    // Set drawing properties
    this.ctx.strokeStyle = strokeData.color;
    this.ctx.lineWidth = strokeData.width;
    this.ctx.globalCompositeOperation = strokeData.mode;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.lastPoint = strokeData.point;
  }

  draw(point) {
    if (!this.isDrawing) return;

    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();

    this.lastPoint = point;
  }

  stopDrawing() {
    this.isDrawing = false;
    this.ctx.closePath();
    this.lastPoint = null;
  }

  // --- Remote User Drawing ---

  startRemoteDrawing(userId, strokeData) {
    // Store the context for this remote user
    this.remoteDrawers[userId] = {
      color: strokeData.color,
      width: strokeData.width,
      mode: strokeData.mode,
      lastPoint: strokeData.path[0]
    };
    
    // Start drawing
    this.ctx.beginPath();
    this.ctx.moveTo(strokeData.path[0].x, strokeData.path[0].y);
    
    // Apply their settings
    this.ctx.strokeStyle = strokeData.color;
    this.ctx.lineWidth = strokeData.width;
    this.ctx.globalCompositeOperation = strokeData.mode;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  drawRemote(userId, point) {
    const drawer = this.remoteDrawers[userId];
    if (!drawer) return; // No active stroke for this user

    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();

    drawer.lastPoint = point;
  }
  
  // --- Global State Redraw ---
  
  redrawFromHistory(history) {
    // 1. Clear the canvas completely
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Loop through every operation in history
    history.forEach(op => {
      this.drawOperation(op);
    });
  }

  /**
   * Helper function to draw a single operation object
   * (used by redrawFromHistory)
   */
  drawOperation(op) {
    if (op.type !== 'stroke' || !op.path || op.path.length === 0) {
      return;
    }

    this.ctx.beginPath();
    
    // Set properties
    this.ctx.strokeStyle = op.color;
    this.ctx.lineWidth = op.width;
    this.ctx.globalCompositeOperation = op.mode;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Move to the first point
    this.ctx.moveTo(op.path[0].x, op.path[0].y);
    
    // Draw all subsequent points
    for (let i = 1; i < op.path.length; i++) {
      this.ctx.lineTo(op.path[i].x, op.path[i].y);
    }
    
    // Stroke the path
    this.ctx.stroke();
    this.ctx.closePath();
    
    // Reset to default
    this.ctx.globalCompositeOperation = 'source-over';
  }
}