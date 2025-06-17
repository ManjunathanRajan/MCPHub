import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Enhanced MCP Server operations with fixed search
export const getMCPServers = async () => {
  const { data, error } = await supabase
    .from('mcp_servers')
    .select('*')
    .order('downloads', { ascending: false })
  
  return { data, error }
}

export const searchMCPServers = async (
  query: string, 
  category?: string,
  minSecurityScore: number = 0,
  verifiedOnly: boolean = false
) => {
  const { data, error } = await supabase.rpc('search_mcp_servers', {
    search_query: query || '',
    category_filter: category || 'all',
    min_security_score: minSecurityScore,
    verified_only: verifiedOnly
  })
  
  return { data, error }
}

export const getServerSecurityInfo = async (serverId: string) => {
  const { data, error } = await supabase
    .from('security_scan_results')
    .select('*')
    .eq('server_id', serverId)
    .order('scanned_at', { ascending: false })
    .limit(10)
  
  return { data, error }
}

export const getServerReputation = async (serverId: string) => {
  const { data, error } = await supabase
    .from('server_reputation')
    .select('*')
    .eq('server_id', serverId)
    .single()
  
  return { data, error }
}

export const addToFavorites = async (serverId: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('user_favorites')
    .insert({ user_id: user.id, server_id: serverId })
  
  return { data, error }
}

export const removeFromFavorites = async (serverId: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('server_id', serverId)
  
  return { error }
}

export const getUserFavorites = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  
  const { data, error } = await supabase
    .from('user_favorites')
    .select('server_id')
    .eq('user_id', user.id)
  
  return { data: data?.map(f => f.server_id) || [], error }
}

export const installServer = async (serverId: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // First increment download count
  await supabase.rpc('increment_downloads', { server_id: serverId })
  
  // Then add to user installations
  const { data, error } = await supabase
    .from('server_installations')
    .insert({ user_id: user.id, server_id: serverId })
  
  return { data, error }
}

export const getUserInstallations = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  
  const { data, error } = await supabase
    .from('server_installations')
    .select(`
      *,
      mcp_servers (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
  
  return { data, error }
}

// Security scanning functions
export const triggerSecurityScan = async (serverId: string, scanType: string = 'full') => {
  // In production, this would trigger a background job
  // For now, we'll simulate the scan process
  const { data, error } = await supabase
    .from('security_scan_results')
    .insert({
      server_id: serverId,
      scan_type: scanType,
      scan_version: '1.0.0',
      status: 'pending'
    })
    .select()
    .single()
  
  return { data, error }
}

export const getSecurityPolicies = async () => {
  const { data, error } = await supabase
    .from('security_policies')
    .select('*')
    .eq('enabled', true)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const getVulnerabilityStats = async () => {
  const { data, error } = await supabase
    .from('server_vulnerabilities')
    .select('severity, status')
  
  if (error) return { data: null, error }
  
  const stats = data.reduce((acc, vuln) => {
    const key = `${vuln.severity}_${vuln.status}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return { data: stats, error: null }
}

// Analytics functions
export const getServerAnalytics = async (serverId: string) => {
  const [serverData, securityData, reputationData] = await Promise.all([
    supabase.from('mcp_servers').select('*').eq('id', serverId).single(),
    getServerSecurityInfo(serverId),
    getServerReputation(serverId)
  ])
  
  return {
    server: serverData.data,
    security: securityData.data,
    reputation: reputationData.data,
    error: serverData.error || securityData.error || reputationData.error
  }
}

export const getGlobalAnalytics = async () => {
  const [serversCount, vulnerabilityStats, avgSecurityScore] = await Promise.all([
    supabase.from('mcp_servers').select('id', { count: 'exact' }),
    getVulnerabilityStats(),
    supabase.from('mcp_servers').select('security_score')
  ])
  
  const avgScore = avgSecurityScore.data 
    ? avgSecurityScore.data.reduce((sum, s) => sum + s.security_score, 0) / avgSecurityScore.data.length
    : 0
  
  return {
    totalServers: serversCount.count || 0,
    vulnerabilityStats: vulnerabilityStats.data || {},
    averageSecurityScore: Math.round(avgScore),
    error: serversCount.error || vulnerabilityStats.error || avgSecurityScore.error
  }
}