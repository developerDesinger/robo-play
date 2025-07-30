const Joi = require("joi");

const reviewSchema = Joi.object({
  description: Joi.string().max(300).trim().required(),
  rating: Joi.number().min(1).max(5).required(),
  professional: Joi.string().optional(), // Assuming professional is an ObjectId (string in Joi)
  facility: Joi.string().optional(), // Assuming facility is an ObjectId
  service: Joi.array().items(Joi.string()).optional(), // Assuming service is an array of ObjectIds
  reviewType: Joi.string()
    .valid("professional", "facility", "client")
    .required(),
  updated_by: Joi.string().optional(),
  updated_on: Joi.date().optional(),
});

module.exports = reviewSchema;
