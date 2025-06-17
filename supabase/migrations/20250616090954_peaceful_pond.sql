/*
  # Create MCP Servers Database Schema

  1. New Tables
    - `mcp_servers`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `category` (text)
      - `security_score` (integer)
      - `downloads` (integer, default 0)
      - `rating` (decimal)
      - `compatibility` (text array)
      - `last_updated` (timestamp)
      - `author` (text)
      - `verified` (boolean, default false)
      - `tags` (text array)
      - `install_command` (text)
      - `github_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `server_id` (uuid, references mcp_servers)
      - `created_at` (timestamp)
    
    - `server_installations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `server_id` (uuid, references mcp_servers)
      - `installed_at` (timestamp)
      - `status` (text, default 'active')

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create MCP Servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  security_score integer NOT NULL DEFAULT 0,
  downloads integer DEFAULT 0,
  rating decimal(2,1) DEFAULT 0.0,
  compatibility text[] DEFAULT '{}',
  last_updated timestamptz DEFAULT now(),
  author text NOT NULL,
  verified boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  install_command text,
  github_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create User Favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, server_id)
);

-- Create Server Installations table
CREATE TABLE IF NOT EXISTS server_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  installed_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  UNIQUE(user_id, server_id)
);

-- Enable Row Level Security
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_installations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_servers (public read, admin write)
CREATE POLICY "Anyone can read MCP servers"
  ON mcp_servers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert MCP servers"
  ON mcp_servers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_favorites
CREATE POLICY "Users can manage their own favorites"
  ON user_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for server_installations
CREATE POLICY "Users can manage their own installations"
  ON server_installations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert sample data
INSERT INTO mcp_servers (name, description, category, security_score, downloads, rating, compatibility, author, verified, tags, install_command, github_url) VALUES
('slack-connector', 'Secure Slack workspace integration with advanced message handling and channel management', 'Communication', 98, 45230, 4.8, ARRAY['claude-3', 'gpt-4', 'gemini-pro'], 'SlackTeam', true, ARRAY['messaging', 'collaboration', 'real-time'], 'npm install @mcphub/slack-connector', 'https://github.com/mcphub/slack-connector'),
('github-integration', 'Complete GitHub API wrapper with repository management, PR automation, and code analysis', 'Development', 95, 38920, 4.9, ARRAY['claude-3', 'gpt-4'], 'GitHubInc', true, ARRAY['git', 'code', 'automation'], 'npm install @mcphub/github-integration', 'https://github.com/mcphub/github-integration'),
('postgres-client', 'High-performance PostgreSQL connector with query optimization and transaction management', 'Database', 92, 29105, 4.7, ARRAY['claude-3', 'gpt-4', 'gemini-pro'], 'PostgreSQL', true, ARRAY['database', 'sql', 'performance'], 'npm install @mcphub/postgres-client', 'https://github.com/mcphub/postgres-client'),
('notion-sync', 'Bidirectional Notion workspace synchronization with real-time updates and conflict resolution', 'Productivity', 89, 22840, 4.6, ARRAY['claude-3', 'gemini-pro'], 'NotionHQ', false, ARRAY['productivity', 'sync', 'collaboration'], 'npm install @mcphub/notion-sync', 'https://github.com/mcphub/notion-sync'),
('stripe-payments', 'Comprehensive Stripe integration for payment processing with subscription management', 'Finance', 96, 18560, 4.8, ARRAY['claude-3', 'gpt-4'], 'StripeInc', true, ARRAY['payments', 'subscription', 'ecommerce'], 'npm install @mcphub/stripe-payments', 'https://github.com/mcphub/stripe-payments'),
('openai-assistant', 'Advanced OpenAI GPT integration with function calling and conversation management', 'AI/ML', 94, 67890, 4.9, ARRAY['claude-3', 'gpt-4'], 'OpenAI', true, ARRAY['ai', 'gpt', 'assistant'], 'npm install @mcphub/openai-assistant', 'https://github.com/mcphub/openai-assistant'),
('discord-bot', 'Full-featured Discord bot framework with slash commands and event handling', 'Communication', 91, 34567, 4.5, ARRAY['claude-3', 'gpt-4'], 'DiscordJS', true, ARRAY['discord', 'bot', 'gaming'], 'npm install @mcphub/discord-bot', 'https://github.com/mcphub/discord-bot'),
('mongodb-client', 'Modern MongoDB connector with aggregation pipeline support and schema validation', 'Database', 88, 25432, 4.4, ARRAY['claude-3', 'gemini-pro'], 'MongoDB', false, ARRAY['database', 'nosql', 'mongodb'], 'npm install @mcphub/mongodb-client', 'https://github.com/mcphub/mongodb-client');