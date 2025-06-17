import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Eye, Search, Filter,
  TrendingUp, TrendingDown, Clock, Zap, Bug, Lock, AlertCircle,
  XCircle, Info
} from 'lucide-react';
import { getServerSecurityInfo, getVulnerabilityStats, getSecurityPolicies, triggerSecurityScan } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import type { SecurityScanResult, SecurityPolicy } from '../types/database';

interface SecurityDashboardProps {
  servers: any[];
  onScanComplete?: () => void;
}

export default function SecurityDashboard({ servers, onScanComplete }: SecurityDashboardProps) {
  const [vulnerabilityStats, setVulnerabilityStats] = useState<Record<string, number>>({});
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([]);
  const [recentScans, setRecentScans] = useState<SecurityScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [scanningServers, setScanningServers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [vulnStats, policies] = await Promise.all([
        getVulnerabilityStats(),
        getSecurityPolicies()
      ]);

      if (vulnStats.data) setVulnerabilityStats(vulnStats.data);
      if (policies.data) setSecurityPolicies(policies.data);

      // Load recent scans for top servers
      if (servers.length > 0) {
        const scanPromises = servers.slice(0, 5).map(server => 
          getServerSecurityInfo(server.id)
        );
        const scanResults = await Promise.all(scanPromises);
        const allScans = scanResults.flatMap(result => result.data || []);
        setRecentScans(allScans.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = async (serverId: string) => {
    setScanningServers(prev => new Set([...prev, serverId]));
    try {
      await triggerSecurityScan(serverId, 'full');
      // Simulate scan completion after 3 seconds
      setTimeout(() => {
        setScanningServers(prev => {
          const newSet = new Set(prev);
          newSet.delete(serverId);
          return newSet;
        });
        loadSecurityData();
        onScanComplete?.();
      }, 3000);
    } catch (error) {
      console.error('Error triggering scan:', error);
      setScanningServers(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getPolicyPriorityIndicator = (policyType: string, severityThreshold: string) => {
    const isHighPriority = severityThreshold === 'critical' || severityThreshold === 'high';
    const isCritical = severityThreshold === 'critical';
    
    if (isCritical) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Critical</span>
        </div>
      );
    } else if (isHighPriority) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">High Priority</span>
        </div>
      );
    }
    return null;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" className="mx-auto" />
        <p className="text-gray-600 mt-4">Loading security data...</p>
      </div>
    );
  }

  const totalVulns = Object.values(vulnerabilityStats).reduce((sum, count) => sum + count, 0);
  const criticalVulns = vulnerabilityStats['critical_open'] || 0;
  const highVulns = vulnerabilityStats['high_open'] || 0;
  const fixedVulns = Object.keys(vulnerabilityStats)
    .filter(key => key.includes('_fixed'))
    .reduce((sum, key) => sum + vulnerabilityStats[key], 0);

  return (
    <div className="space-y-8">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Threat Level</h3>
            <Shield className={`w-6 h-6 ${criticalVulns > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <div className={`text-3xl font-bold mb-2 ${criticalVulns > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {criticalVulns > 0 ? 'HIGH' : 'LOW'}
          </div>
          <p className="text-sm text-gray-600">
            {criticalVulns > 0 ? `${criticalVulns} critical issues` : 'All systems secure'}
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Active Scans</h3>
            <Eye className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">{servers.length}</div>
          <p className="text-sm text-gray-600">Servers being monitored</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Vulnerabilities</h3>
            <Bug className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">{totalVulns}</div>
          <p className="text-sm text-gray-600">
            {fixedVulns > 0 ? `${fixedVulns} fixed this week` : 'Total found'}
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Security Score</h3>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {Math.round(servers.reduce((sum, s) => sum + s.security_score, 0) / servers.length)}
          </div>
          <p className="text-sm text-gray-600">Average across all servers</p>
        </div>
      </div>

      {/* Vulnerability Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Vulnerability Breakdown</h3>
          <div className="space-y-4">
            {['critical', 'high', 'medium', 'low'].map(severity => {
              const openCount = vulnerabilityStats[`${severity}_open`] || 0;
              const fixedCount = vulnerabilityStats[`${severity}_fixed`] || 0;
              const total = openCount + fixedCount;
              
              return (
                <div key={severity} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getSeverityIcon(severity)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 capitalize">{severity}</p>
                        {(severity === 'critical' || severity === 'high') && openCount > 0 && (
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${
                              severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                            }`}></div>
                            <span className={`text-xs font-medium uppercase tracking-wide ${
                              severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {severity === 'critical' ? 'Urgent' : 'Important'}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {openCount} open, {fixedCount} fixed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{total}</p>
                    <p className="text-sm text-gray-600">total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Server Security Status</h3>
            <button
              onClick={() => servers.slice(0, 3).forEach(s => handleTriggerScan(s.id))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Scan All
            </button>
          </div>
          <div className="space-y-3">
            {servers.slice(0, 5).map(server => (
              <div key={server.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    server.security_score >= 95 ? 'bg-green-500' :
                    server.security_score >= 90 ? 'bg-blue-500' :
                    server.security_score >= 85 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{server.name}</p>
                    <p className="text-sm text-gray-600">Score: {server.security_score}/100</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTriggerScan(server.id)}
                  disabled={scanningServers.has(server.id)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanningServers.has(server.id) ? (
                    <div className="flex items-center space-x-1">
                      <LoadingSpinner size="sm" />
                      <span>Scanning...</span>
                    </div>
                  ) : (
                    'Scan'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="space-y-4">
          {recentScans
            .filter(scan => selectedSeverity === 'all' || scan.severity === selectedSeverity)
            .slice(0, 8)
            .map((scan, index) => {
              const server = servers.find(s => s.id === scan.server_id);
              return (
                <div key={scan.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className={`p-2 rounded-lg border ${getSeverityColor(scan.severity || 'info')}`}>
                    {getSeverityIcon(scan.severity || 'info')}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span className="font-medium">{server?.name || 'Unknown Server'}</span>
                      {' '}
                      {scan.status === 'completed' ? 'completed security scan' : 
                       scan.status === 'failed' ? 'failed security scan' : 'started security scan'}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span>{formatTimeAgo(scan.scanned_at)}</span>
                      {scan.vulnerabilities && scan.vulnerabilities.length > 0 && (
                        <span>{scan.vulnerabilities.length} issues found</span>
                      )}
                      {scan.scan_duration_ms && (
                        <span>{(scan.scan_duration_ms / 1000).toFixed(1)}s duration</span>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    scan.status === 'completed' ? 'bg-green-100 text-green-700' :
                    scan.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {scan.status}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Enhanced Security Policies */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Active Security Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityPolicies.map(policy => (
            <div key={policy.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{policy.name}</h4>
                <div className="flex items-center space-x-2">
                  {getPolicyPriorityIndicator(policy.policy_type, policy.severity_threshold)}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    policy.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {policy.enabled ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{policy.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {policy.policy_type} • {policy.severity_threshold}+
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(policy.auto_action)}`}>
                  {policy.auto_action}
                </span>
              </div>
              {(policy.severity_threshold === 'critical' || policy.severity_threshold === 'high') && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700 font-medium">
                      This policy requires immediate attention when triggered
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}