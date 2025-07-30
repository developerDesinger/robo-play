const Joi = require("joi");

// Joi validation schema for story creation and updates
const storyValidationSchema = Joi.object({
  professionalId: Joi.string().required().messages({
    "any.required": "Professional ID is required",
    "string.empty": "Professional ID cannot be empty",
  }),
  resource: Joi.string().uri().required().messages({
    "any.required": "Resource URL is required",
  }),
  mediaType: Joi.string().valid("VIDEO", "IMAGE").required().messages({
    "any.required": "Media type is required",
    "any.only": "Media type must be either VIDEO or IMAGE",
  }),
});

module.exports = storyValidationSchema;
