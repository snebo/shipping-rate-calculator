import * as Joi from 'joi';

export const shippingEnvSchema = Joi.object({
  UPS_CLIENT_ID: Joi.string().required(),
  UPS_CLIENT_SECRET: Joi.string().required(),
  UPS_OAUTH_TOKEN_URL: Joi.string().uri().required(),
  UPS_RATING_URL: Joi.string().uri().required(),
  UPS_HTTP_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
  UPS_TOKEN_SKEW_SECONDS: Joi.number().integer().min(0).default(30),
});
