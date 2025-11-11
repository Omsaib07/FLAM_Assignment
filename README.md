# Real-Time Collaborative Canvas

A multi-user drawing application built with Node.js, Express, Socket.io, and Vanilla JavaScript (HTML5 Canvas).

## 🚀 Live Demo

**The live application is deployed on Render:**

[**https://drawing-app-vr4u.onrender.com**](https://drawing-app-vr4u.onrender.com)

*(Note: The server is on Render's free tier, so it may take up to 30 seconds to spin up if it hasn't been used in a while.)*

---

## 🧪 How to Test with Multiple Users

1.  **Open the live link:** [https://drawing-app-vr4u.onrender.com](https://drawing-app-vr4u.onrender.com)
2.  **Open the link again** in a second browser window (e.g., an Incognito window or a different browser).
3.  You should see both users in the "Online Users" list.
4.  Draw in one window and observe the real-time updates in the other.
5.  Test the "Undo" and "Redo" buttons to see the global state sync.

---

## 🛠️ Local Setup & Running (Optional)

If you wish to run the project on your local machine:

1.  **Clone the repository:**
    ```bash
    git clone [your-github-repo-link]
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

---

## 💡 Key Features

* **Real-Time Sync:** Uses WebSockets (Socket.io) to broadcast drawing data instantly to all clients.
* **Global State:** A server-authoritative `operationHistory` array ensures all clients are in perfect sync.
* **Global Undo/Redo:** A server-side `redoStack` and `operationHistory` allow any user to undo or redo actions for everyone.
* **Live Cursors:** See where other users are pointing on the canvas in real-time.
* **Dynamic Toolbar:** Custom, resizable cursor that changes from a brush to an eraser.
* **Responsive UI:** The toolbar and user list adapt to different screen sizes, including split-screen.


