import { config } from "dotenv";
config();
export const pusherCluster = process.env.PUSHER_CLUSTER || "";
export const pusherId = process.env.PUSHER_APP_ID || "";
export const port = process.env.PORT || 3001;