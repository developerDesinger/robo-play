const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `Node/Express Rest Api's for RCC`,
      version: "0.0.1",
      description: "API documentation for RCC application",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          name: "authorization",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    servers: [
      {
        url: "http://localhost:5000/", // HTTP server
        description: "LOCAL DEV Server (HTTP)",
      },
      {
        url: "http://localhost:8000/", // HTTP server
        description: "LOCAL DEV Server (HTTP)",
      },
    ],
  },
  apis: [
    // V1 routes
    "./src/api/v1/routes/blogs.js",
    "./src/api/v1/swagger/CompanySwagger.js",
  ], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

// console.log(swaggerSpec);

module.exports = swaggerSpec;
