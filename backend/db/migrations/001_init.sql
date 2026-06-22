-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- URLs table
CREATE TABLE IF NOT EXISTS urls (
  id            SERIAL PRIMARY KEY,
  short_code    VARCHAR(20)  NOT NULL UNIQUE,
  long_url      TEXT         NOT NULL,
  custom_alias  VARCHAR(50)  UNIQUE,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  click_count   INTEGER      NOT NULL DEFAULT 0,
  shard_key     VARCHAR(10)  NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMP    NULL
);

CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
CREATE INDEX IF NOT EXISTS idx_urls_user_id    ON urls(user_id);
CREATE INDEX IF NOT EXISTS idx_urls_shard_key  ON urls(shard_key);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id          SERIAL PRIMARY KEY,
  url_id      INTEGER     NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  timestamp   TIMESTAMP   NOT NULL DEFAULT NOW(),
  ip_address  VARCHAR(45) NOT NULL,
  browser     VARCHAR(100),
  device      VARCHAR(20),
  os          VARCHAR(100),
  referrer    VARCHAR(500),
  country     VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_analytics_url_id    ON analytics(url_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
