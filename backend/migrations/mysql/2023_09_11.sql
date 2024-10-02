alter table refresh_token add column `created` timestamp NOT NULL DEFAULT current_timestamp() after `refreshToken`;
