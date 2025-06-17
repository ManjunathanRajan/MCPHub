export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: string;
  security_score: number;
  downloads: number;
  rating: number;
  compatibility: string[];
  last_updated: string;
  author: string;
  verified: boolean;
  tags: string[];
  install_command?: string;
  github_url?: string;
  created_at: string;
  updated_at: string;
  search_rank?: number;
  trust_score?: number;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  server_id: string;
  created_at: string;
}

export interface ServerInstallation {
  id: string;
  user_id: string;
  server_id: string;
  installed_at: string;
  status: string;
}

export interface SecurityScanResult {
  id: string;
  server_id: string;
  scan_type: string;
  scan_version: string;
  status: 'pending' | 'completed' | 'failed';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  vulnerabilities: any[];
  recommendations: any[];
  scan_duration_ms?: number;
  scanned_at: string;
  created_at: string;
}

export interface ServerVulnerability {
  id: string;
  server_id: string;
  vulnerability_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affected_versions: string[];
  fixed_version?: string;
  status: 'open' | 'fixed' | 'ignored';
  first_detected: string;
  last_seen: string;
  created_at: string;
}

export interface ServerReputation {
  id: string;
  server_id: string;
  trust_score: number;
  reputation_factors: Record<string, any>;
  community_reports: number;
  false_positive_reports: number;
  last_calculated: string;
  created_at: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  policy_type: 'vulnerability' | 'license' | 'dependency';
  severity_threshold: 'critical' | 'high' | 'medium' | 'low';
  auto_action: 'flag' | 'quarantine' | 'remove';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      mcp_servers: {
        Row: MCPServer;
        Insert: Omit<MCPServer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MCPServer, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_favorites: {
        Row: UserFavorite;
        Insert: Omit<UserFavorite, 'id' | 'created_at'>;
        Update: Partial<Omit<UserFavorite, 'id' | 'created_at'>>;
      };
      server_installations: {
        Row: ServerInstallation;
        Insert: Omit<ServerInstallation, 'id' | 'installed_at'>;
        Update: Partial<Omit<ServerInstallation, 'id' | 'installed_at'>>;
      };
      security_scan_results: {
        Row: SecurityScanResult;
        Insert: Omit<SecurityScanResult, 'id' | 'created_at'>;
        Update: Partial<Omit<SecurityScanResult, 'id' | 'created_at'>>;
      };
      server_vulnerabilities: {
        Row: ServerVulnerability;
        Insert: Omit<ServerVulnerability, 'id' | 'created_at'>;
        Update: Partial<Omit<ServerVulnerability, 'id' | 'created_at'>>;
      };
      server_reputation: {
        Row: ServerReputation;
        Insert: Omit<ServerReputation, 'id' | 'created_at'>;
        Update: Partial<Omit<ServerReputation, 'id' | 'created_at'>>;
      };
      security_policies: {
        Row: SecurityPolicy;
        Insert: Omit<SecurityPolicy, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SecurityPolicy, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}