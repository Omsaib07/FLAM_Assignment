# Real-Time Collaborative Canvas

A multi-user drawing application built with Node.js, Express, Socket.io, and Vanilla JavaScript (HTML5 Canvas).

## 🚀 Setup & Running

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-link]
    cd collaborative-canvas
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the server:**
    ```bash
    npm start
    ```
4.  **Open the application:**
    Open `http://localhost:3000` in your browser.

## 🧪 How to Test with Multiple Users

1.  Run the server (`npm start`).
2.  Open `http://localhost:3000` in a normal browser window.
3.  Open `http://localhost:3000` in a second browser window (e.g., an Incognito window or a different browser).
4.  You should see two users in the "Online Users" list.
5.  Draw in one window and observe the real-time updates in the other.
6.  Test the "Undo" and "Redo" buttons. The action should be global and affect both canvases.

## Known Limitations

* **Canvas Resize:** Resizing the browser window clears the canvas locally. The canvas will be restored on the *next* global event (like an undo or another user's stroke). A more robust solution would store the history locally and redraw, or request it from the server.
* **Performance:** Redrawing the *entire* history on every undo/redo is not scalable for a long-running session with thousands of operations. A production app might use canvas layering or more complex state diffing.
* **Conflict Resolution:** This implementation uses a "last-write-wins" model for strokes and a "server-authority" model for undo. Simultaneous drawing in the same spot is handled, but simultaneous *undo* requests could be improved (e.g., with a server-side action queue).


