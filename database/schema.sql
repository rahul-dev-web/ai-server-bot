-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id VARCHAR UNIQUE NOT NULL,
  username VARCHAR NOT NULL,
  avatar VARCHAR,
  email VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Servers Table
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR UNIQUE NOT NULL,
  owner_discord_id VARCHAR NOT NULL,
  server_name VARCHAR NOT NULL,
  server_icon VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations Table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR NOT NULL,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  sender VARCHAR DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Actions Table
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR NOT NULL,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  result JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Requests Table
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR NOT NULL,
  user_id UUID REFERENCES users(id),
  prompt TEXT NOT NULL,
  response JSON NOT NULL,
  tokens_used INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR NOT NULL,
  user_discord_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  result VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes for performance
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_servers_guild_id ON servers(guild_id);
CREATE INDEX idx_conversations_guild_id ON conversations(guild_id);
CREATE INDEX idx_actions_guild_id ON actions(guild_id);
CREATE INDEX idx_ai_requests_guild_id ON ai_requests(guild_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Servers visible to owner"
  ON servers FOR SELECT
  USING (auth.uid()::text = owner_discord_id::text);
