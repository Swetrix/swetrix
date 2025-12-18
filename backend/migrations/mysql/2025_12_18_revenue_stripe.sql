-- Add Stripe API key fields for revenue integration
ALTER TABLE `project` ADD COLUMN `stripeApiKeyEnc` text DEFAULT NULL;
ALTER TABLE `project` ADD COLUMN `stripeApiKeyPermissions` text DEFAULT NULL;
