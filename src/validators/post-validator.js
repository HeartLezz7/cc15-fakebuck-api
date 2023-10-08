const Joi = require("joi");

const checkPostIdSchema = Joi.object({
  postId: Joi.number().integer().positive().required(),
});

exports.checkPostIdSchema = checkPostIdSchema;
