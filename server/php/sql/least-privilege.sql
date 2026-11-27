-- Least-privilege database account for the Hayata API.
--
-- Run this as a MySQL administrator AFTER applying the migrations. The API
-- needs to read and write application rows, but it must never be able to drop
-- a table, change the schema or grant rights to another account. Migrations are
-- a separate, deliberately privileged operation run by hand with migrate.php.
--
-- Replace the placeholder password and, if the API connects from another host,
-- change 'localhost' to that host. Keep this file out of any public web folder.

CREATE USER IF NOT EXISTS 'hayata_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE ON `hayata_data`.* TO 'hayata_app'@'localhost';

-- Explicitly deny the powerful privileges a web application never needs.
REVOKE CREATE, DROP, ALTER, INDEX, REFERENCES, EXECUTE, FILE, LOCK TABLES,
       PROCESS, RELOAD, SHUTDOWN, SUPER, GRANT OPTION
    ON *.* FROM 'hayata_app'@'localhost';

FLUSH PRIVILEGES;

-- Verify with:
--   SHOW GRANTS FOR 'hayata_app'@'localhost';
