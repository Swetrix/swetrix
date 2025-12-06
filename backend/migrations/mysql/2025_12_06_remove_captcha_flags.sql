-- Remove isCaptchaProject and isCaptchaEnabled columns from project table
-- CAPTCHA functionality is now determined by the presence of captchaSecretKey

ALTER TABLE project DROP COLUMN `isCaptchaProject`;
ALTER TABLE project DROP COLUMN `isCaptchaEnabled`;
