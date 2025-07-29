-- Create test database
CREATE DATABASE foodmission_test_db;

-- Create Keycloak database
CREATE DATABASE keycloak_db;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE foodmission_test_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO postgres;