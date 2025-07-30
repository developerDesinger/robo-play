const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config();
const app = require("./app"); 

const socketIo = require('socket.io');
const User = require("./src/api/v1/model/Users");
const SocketService = require("./src/api/v1/sockets/socket.service");
const seedDatabaseAndCreateSuperAdmin = require("./src/api/v1/utils/superAdminCreation");

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.name, err.message);
  process.exit(1);
});

const dbURI = process.env.DEV_DATABASE;
console.log("db_URI ... ", dbURI);

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true, // Required for MongoDB Atlas SSL connections
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully!");

    try {
      const users = await User.find();
      if (users.length === 0) {
        console.log("⚡ No users found. Seeding database with Super Admin...");
        await seedDatabaseAndCreateSuperAdmin();
        console.log("✅ Super Admin created successfully!");
      }
    } catch (error) {
      console.error("❌ Error querying users:", error);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // Exit process on connection failure
  });


const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// Route to handle image upload
app.post("/upload-image", async (req, res) => {
  const { imageBase64, contentType } = req.body;

  // Call the uploadImage method of the ImageUploader class
  const result = await uploadToS3(imageBase64, contentType);

  if (result.success) {
    return res.status(200).json(result); // Successful upload
  } else {
    return res.status(500).json(result); // Error during upload
  }
});
// server.listen(port, () => {
//   console.log(`App running on port ${port}`);
// });

// process.on("unhandledRejection", (err) => {
//   console.error("Unhandled Rejection:", err.name, err.message);
//   process.exit(1);
// });



// Initialize SocketService (make sure your SocketService.js handles IO connections)
SocketService.init(io);
//const chatServiceInstance = new ChatService(io);
// Start the server
server.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.name, err.message);
  process.exit(1);
});



