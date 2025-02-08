import { WebSocket, WebSocketServer } from "ws";
import { UserManager } from "./UserManager";
import express from "express";
import cron from "node-cron";
import http from "http";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });  // Attach WebSocket to HTTP server

// HTTP endpoints
app.get("/health", (_req, res) => {
    res.send("Hello World");
});

// WebSocket connection handling
wss.on("connection", (ws: WebSocket) => {
    console.log("New connection");
    UserManager.getInstance().addUser(ws);
});

// Start server (handles both HTTP and WebSocket)
server.listen(PORT, () => {
    console.log("Health check - server is alive from the HTTP");
    console.log(`Server running on port ${PORT}`);
});

// Cron job to keep the server alive
cron.schedule('*/12 * * * *', () => {
    console.log('Health check - server is alive');
});