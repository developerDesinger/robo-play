//const OrderModal = require("../../v1/model/orderModel");
const mongoose = require("mongoose");
const { fetchUserUsingToken } = require("../middlewares/auth.middleware");

class SocketService {
  static io = null; // Store Socket.IO instance
  static connectedUsers = []; // Array to store connected users with userId and socketId
  static userLocations = []; // Array to store connected users with userId and socketId

  // Initialize the Socket.IO server
  static init(io) {
    if (!io) {
      console.error("Socket.IO instance not provided!");
      return;
    }
    this.io = io;

    // Listen for new connections
    this.io.on("connection", (socket) => {
      console.log(`Socket Connection Established...`); // Log new connections

      // Listen for 'addUser' event to add a user
      socket.on("addUser", async (token) => {
        console.log("Token123 : ", token);

        const parsedToken =
          typeof token === "string" ? JSON.parse(token) : token;
        console.log("Parsed Token: ", parsedToken);
        console.log("Extracted Token: ", parsedToken?.token);
        const incomingUser = await fetchUserUsingToken(parsedToken?.token);

        this.addUser(incomingUser?.id, socket.id); // Call addUser function when user connects
        console.log("SOCKETS USERS : ", this.connectedUsers);
      });

      // Handle user disconnection
      socket.on("disconnect", () => {
        console.log(`User Disconnected : ${socket.id}`);
        this.removeUser(socket.id); // Remove the user when they disconnect
        console.log("SOCKETS USERS : ", this.connectedUsers);
      });
    });
  }

  static addUser(userId, socketId) {
    console.log(
      `Trying to add user with userId: ${userId}, Socket ID: ${socketId}`
    );

    const existingUserIndex = this.connectedUsers.findIndex(
      (user) => user.userId === userId
    );

    if (existingUserIndex === -1) {
      // User does not exist, add them to the array
      this.connectedUsers.push({ userId, socketId });
      console.log(`User added: ${userId}, Socket ID: ${socketId}`);
    } else {
      // User already exists, update their socketId
      this.connectedUsers[existingUserIndex].socketId = socketId;
      console.log(`User updated with new Socket ID: ${socketId}`);
    }
  }

  static removeUser(socketId) {
    this.connectedUsers = this.connectedUsers.filter(
      (user) => user.socketId !== socketId
    );
    console.log(`User removed with Socket ID: ${socketId}`);
  }

  static getUser(userId) {
    // console.log("userId : ", userId);
    console.log("SocketUsers : ", this.connectedUsers);
    return this.connectedUsers?.find((user) => user.userId == userId);
  }

  static emitMessageToUser(userId, message) {
    console.log("@@@@@@@@@@@@@@@@@", userId, message);
    const user = this.getUser(userId); // Check if the user is connected
    if (user) {
      console.log(
        `Emitting message to user: ${userId}, Socket ID: ${user.socketId}`
      );
      this.io.to(user.socketId).emit("newMessage", message); // Emit the message to the user
      console.log("newMessage");
    } else {
      console.log(`User with ID: ${userId} is not connected.`);
    }
  }

}

module.exports = SocketService;
