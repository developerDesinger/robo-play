const createError = require("http-errors");
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const globalErrorHandler = require("./src/api/v1/middlewares/globalErrorHandler");
if (process.env.NODE_ENV === "PRODUCTION") {
  require("dotenv").config({ path: "./.env.production" });
} else {
  require("dotenv").config();
}

const usersRoutes = require("./src/api/v1/routes/user");
const onBoardingRoutes = require("./src/api/v1/routes/onboarding");

const app = express();
const admin = require("firebase-admin");
const { uploadToS3 } = require("./src/api/v1/services/aws.service");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet());

if (process.env.NODE_ENV === "DEVELOPMENT") {
  app.use(logger("dev"));
}

app.use(express.json({ limit: "10kb" }));

app.use(mongoSanitize());

app.use(xssClean());

app.use(hpp());

app.use(cors());

app.use(compression());

app.use(cookieParser());

// V1
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/onboarding", onBoardingRoutes);

app.post("/upload-image", async (req, res) => {
  const { imageBase64, contentType } = req.body;

  // Call the uploadImage method of the ImageUploader class
  const result = await uploadToS3(imageBase64, contentType);

  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
});

app.use("**", function (req, res, next) {
  next(createError(404));
});

app.use(globalErrorHandler);

module.exports = app;
