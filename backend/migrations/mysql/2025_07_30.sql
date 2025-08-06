ALTER TABLE user ADD COLUMN `onboardingStep` enum('create_project','setup_tracking','waiting_for_events','completed') NOT NULL DEFAULT 'create_project' AFTER timeFormat;
ALTER TABLE user ADD COLUMN `hasCompletedOnboarding` tinyint NOT NULL DEFAULT '0' AFTER onboardingStep;

-- Mark all existing users as having completed the onboarding
UPDATE user SET `onboardingStep` = 'completed', `hasCompletedOnboarding` = '1';
