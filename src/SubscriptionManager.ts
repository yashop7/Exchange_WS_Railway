// Removed unused Redis import as it is not used in this file.
import { UserManager } from "./UserManager";
import { pusherCluster, pusherId } from "./config";
import Pusher from "pusher-js"; // Using pusher-js for subscribing (client mode)

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, string[]> = new Map(); // Map of userId to channels they subscribed
  private reverseSubscriptions: Map<string, string[]> = new Map(); // Map of channel to array of userIds
  // private redisClient: RedisClientType;
  private pusherClient: Pusher;

  private constructor() {
    // Initialize Pusher client
    this.pusherClient = new Pusher(pusherId, {
      cluster: pusherCluster,
    });
    console.log("Pusher Client Initialized");

    // // Existing Redis initialization (if still needed)
    // this.redisClient = createClient({
    //   // url: redisUrl  // Uncomment if you want to use Redis as well
    // });
    // this.redisClient.on("error", (err) => {
    //   console.error("Redis Client Error:", err);
    // });
    // this.redisClient.connect().then(() => {
    //   console.log("Connected to Redis Queue");
    // });
    // console.log("Connected to Redis Queue");
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new SubscriptionManager();
    }
    return this.instance;
  }

  /**
   * Subscribe a user to a given channel (subscription).
   * When the first user subscribes to the channel, we subscribe to it via Pusher.
   */
  public subscribe(userId: string, subscription: string) {
    // Add subscription for the user if not already present
    if (this.subscriptions.get(userId)?.includes(subscription)) {
      return;
    }
    this.subscriptions.set(
      userId,
      (this.subscriptions.get(userId) || []).concat(subscription)
    );
    this.reverseSubscriptions.set(
      subscription,
      (this.reverseSubscriptions.get(subscription) || []).concat(userId)
    );

    // If this is the first user for this channel, subscribe to the channel via Pusher.
    if (this.reverseSubscriptions.get(subscription)?.length === 1) {
      console.log("Subscribing to Pusher channel:", subscription);
      const channel = this.pusherClient.subscribe(subscription);
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`Successfully subscribed to channel: ${subscription}`);
      });

      // Bind to the event (for example "my-event") coming on this channel
      channel.bind("my-event", (data: any) => {
        console.log(
          "Pusher callback triggered for channel",
          subscription,
          "data:",
          data
        );
        // Forward the message to every user subscribed to this channel
        console.log(
          "Forwarding message to users subscribed to channel",
          subscription
        );
        console.log("data: ", data);
        this.reverseSubscriptions.get(subscription)?.forEach((uid) => {
          UserManager.getInstance().getUser(uid)?.emit(data);
        });
      });
    }
  }

  /**
   * Unsubscribe a user from a given channel.
   * If no more users are subscribed to that channel, unsubscribe from the channel via Pusher.
   */
  public unsubscribe(userId: string, subscription: string) {
    // Remove the subscription from the user's subscription list.
    const userSubscriptions = this.subscriptions.get(userId);
    if (userSubscriptions) {
      this.subscriptions.set(
        userId,
        userSubscriptions.filter((s) => s !== subscription)
      );
    }

    // Remove the user from the reverse mapping for that channel.
    const users = this.reverseSubscriptions.get(subscription);
    if (users) {
      this.reverseSubscriptions.set(
        subscription,
        users.filter((u) => u !== userId)
      );
      // If no users remain, unsubscribe from the channel on Pusher.
      if (this.reverseSubscriptions.get(subscription)?.length === 0) {
        this.reverseSubscriptions.delete(subscription);
        console.log("Unsubscribing from Pusher channel:", subscription);
        this.pusherClient.unsubscribe(subscription);
      }
    }
  }

  /**
   * Called when a user disconnects; remove all subscriptions for that user.
   */
  public userLeft(userId: string) {
    console.log("User left:");
    this.subscriptions.get(userId)?.forEach((s) => this.unsubscribe(userId, s));
  }

  public getSubscriptions(userId: string) {
    return this.subscriptions.get(userId) || [];
  }
}

// import { type RedisClientType, createClient } from "redis";
// import { UserManager } from "./UserManager";
// import { redisUrl } from "./config";

// export class SubscriptionManager {
//   private static instance: SubscriptionManager;
//   private subscriptions: Map<string, string[]> = new Map();
//   private reverseSubscriptions: Map<string, string[]> = new Map();
//   private redisClient: RedisClientType;

//   private constructor() {
//     this.redisClient = createClient();
//     this.redisClient
//       .connect()
//       .then(() => {
//         console.log("Connected to Redis (Upstash PubSub)");
//       })
//       .catch((err) => {
//         console.error("Error connecting to Redis: ", err);
//       });

//     // if (!this.redisClient.isReady) {
//     //   throw new Error("Redis client is not connected");
//     // }
//   }

//   public static getInstance() {
//     if (!this.instance) {
//       this.instance = new SubscriptionManager();
//     }
//     return this.instance;
//   }

//   public subscribe(userId: string, subscription: string) {
//     if (this.subscriptions.get(userId)?.includes(subscription)) {
//       return;
//     }
//     this.subscriptions.set(
//       userId,
//       (this.subscriptions.get(userId) || []).concat(subscription)
//     );
//     this.reverseSubscriptions.set(
//       subscription,
//       (this.reverseSubscriptions.get(subscription) || []).concat(userId)
//     );
//     if (this.reverseSubscriptions.get(subscription)?.length === 1) {
//       console.log("subscribing to ", subscription);
//       this.redisClient.subscribe(subscription, this.redisCallbackHandler);
//     }
//   }

//   private redisCallbackHandler = (message: string, channel: string) => {
//     console.log("HELLO I AM CALLED");
//     const parsedMessage = JSON.parse(message);
//     console.log("parsedMessage: ", parsedMessage);
//     this.reverseSubscriptions
//       .get(channel)
//       ?.forEach((s) =>
//         UserManager.getInstance().getUser(s)?.emit(parsedMessage)
//       );
//   };

//   public unsubscribe(userId: string, subscription: string) {
//     const subscriptions = this.subscriptions.get(userId);
//     if (subscriptions) {
//       this.subscriptions.set(
//         userId,
//         subscriptions.filter((s) => s !== subscription)
//       );
//     }
//     const reverseSubs = this.reverseSubscriptions.get(subscription);
//     if (reverseSubs) {
//       this.reverseSubscriptions.set(
//         subscription,
//         reverseSubs.filter((s) => s !== userId)
//       );
//       if (this.reverseSubscriptions.get(subscription)?.length === 0) {
//         this.reverseSubscriptions.delete(subscription);
//         this.redisClient.unsubscribe(subscription);
//       }
//     }
//   }

//   public userLeft(userId: string) {
//     console.log("user left " + userId);
//     this.subscriptions.get(userId)?.forEach((s) => this.unsubscribe(userId, s));
//   }

//   public getSubscriptions(userId: string) {
//     return this.subscriptions.get(userId) || [];
//   }
// }
