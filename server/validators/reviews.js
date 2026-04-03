const Joi = require("joi");

const reviewSchema = Joi.object({
  booking_id: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      "any.required": "Booking Id is required",
    }),
  listing_id: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      "any.required": "Listing Id is required",
    }),
  reviewee_id: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      "any.required": "Reviewee Id is required",
    }),
  cleanliness: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Cleanliness must be a number",
    "number.min": "Cleanliness must be at least 1",
    "number.max": "Cleanliness cannot be more than 5",
  }),
  accuracy: Joi.number().integer().min(1).max(5).required(),
  communication: Joi.number().integer().min(1).max(5).required(),
  location_score: Joi.number().integer().min(1).max(5).required(),
  value: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).allow(null, "").optional().messages({
    "string.max": "Comment cannot exceed 2000 characters",
  }),
});

module.exports = reviewSchema;
