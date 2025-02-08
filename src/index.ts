import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws: any) => {
    console.log("New connection");
    UserManager.getInstance().addUser(ws);
});