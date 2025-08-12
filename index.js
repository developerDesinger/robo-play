"use strict";
const upload = require("express-fileupload");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/dbConfig");
const Router = require("./routes/index");
const subscriptionController = require("./controllers/subscription.controller");
require("./trialCheckCron"); // or the correct path

const app = express();

app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log incoming request
  console.log(`\n🚀 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  console.log(`🔍 Query:`, JSON.stringify(req.query, null, 2));
  console.log(`👤 User Agent:`, req.headers["user-agent"] || "Unknown");
  console.log(`🌐 Origin:`, req.headers["origin"] || "No Origin");

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(
      `✅ [${new Date().toISOString()}] ${req.method} ${req.url} - ${
        res.statusCode
      } (${duration}ms)`
    );
    console.log(
      `📤 Response:`,
      typeof data === "string" ? data : JSON.stringify(data, null, 2)
    );
    console.log(
      `📊 Response Headers:`,
      JSON.stringify(res.getHeaders(), null, 2)
    );
    console.log("─".repeat(80));

    originalSend.call(this, data);
  };

  next();
});

// Super simple CORS - allow everything
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true, // Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'], // Allow all headers
    exposedHeaders: ['*'], // Expose all headers
    preflightContinue: false,
    optionsSuccessStatus: 200
  })
);

// Simple fallback for any CORS issues
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});
app.use(compression());
app.use(cookieParser());

// Removde the stripe webhook route from here, it's moved to stripe.route.js
app.post(
  "/api/handleWebhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleWebhook
);

app.use(express.json()); // ✅ Regular JSON parsing for other routes
app.use(upload());
app.use("/api", Router);

// Test endpoint to verify CORS is working
app.get('/test', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful!',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: req.method,
      url: req.url,
      origin: req.headers.origin || 'No origin',
      userAgent: req.headers['user-agent'] || 'No user agent',
      host: req.headers.host || 'No host'
    },
    serverInfo: {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001
    }
  });
});

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
