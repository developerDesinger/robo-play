"use strict";
const upload = require("express-fileupload");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/dbConfig");
const Router = require("./routes/index");
const subscriptionController = require("./controllers/subscription.controller"); // Import webhook handler
require("./trialCheckCron"); // or the correct path

const app = express();

// allow origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://staging.robo-apply.com",
  "https://staging.roboapply.co",
  "https://roboapply-admin-panel.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ This ensures preflight requests respond correctly
app.options("*", cors(corsOptions));

// Removde the stripe webhook route from here, it's moved to stripe.route.js
app.post(
  "/api/handleWebhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleWebhook
);

app.use(express.json()); // ✅ Regular JSON parsing for other routes
app.use(upload());
app.use("/api", Router);

const port = process.env.PORT || 3001;
const env = process.env.NODE_ENV;

const startServer = async () => {
  try {
    await connectDB();
    console.log(`Running in ${env} mode`);
    app.listen(port, (err) => {
      if (err) console.error("Error starting server:", err);
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
  }
};

startServer();
