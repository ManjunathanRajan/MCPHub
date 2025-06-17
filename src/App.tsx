import React, { useState, useEffect } from 'react';
import { Shield, Search, Zap, TrendingUp, Server, Users, ChevronRight, Star, Clock, AlertTriangle, CheckCircle, Play, Settings, BarChart3, GitBranch, Eye, User, LogOut } from 'lucide-react';
import { supabase, getMCPServers, getUserFavorites, addToFavorites, removeFromFavorites, installServer, getUserInstallations, signOut } from './lib/supabase';
import AuthModal from './components/AuthModal';
import ServerCard from './components/ServerCard';
import ServerDetailModal from './components/ServerDetailModal';
import LoadingSpinner from './components/LoadingSpinner';
import ToastContainer from './components/ToastContainer';
import OrchestrationExecutor from './components/OrchestrationExecutor';
import SecurityDashboard from './components/SecurityDashboard';
import AdvancedSearch from './components/AdvancedSearch';
import SettingsModal from './components/SettingsModal';
import { useToast } from './hooks/useToast';
import type { MCPServer } from './types/database';

function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [orchestrationServers, setOrchestrationServers] = useState<string[]>([]);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [filteredServers, setFilteredServers] = useState<MCPServer[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [installations, setInstallations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [showServerDetail, setShowServerDetail] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  // Initialize theme on app load
  useEffect(() => {
    const initializeTheme = () => {
      // Check if user has a saved theme preference
      const savedTheme = localStorage.getItem('mcphub_theme') || 'light';
      applyTheme(savedTheme);
    };

    initializeTheme();
  }, []);

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      }
    }
    // 'light' theme doesn't need a class (default)
    
    // Save theme preference
    localStorage.setItem('mcphub_theme', theme);
  };

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setFavorites([]);
      setInstallations([]);
    }
  }, [user]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const { data, error } = await getMCPServers();
      if (error) throw error;
      setServers(data || []);
      setFilteredServers(data || []);
    } catch (error) {
      console.error('Error loading servers:', error);
      addToast({
        type: 'error',
        title: 'Failed to load servers',
        message: 'Please try again later'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [favoritesResult, installationsResult] = await Promise.all([
        getUserFavorites(),
        getUserInstallations()
      ]);

      if (favoritesResult.data) {
        setFavorites(favoritesResult.data);
      }

      if (installationsResult.data) {
        setInstallations(installationsResult.data.map((inst: any) => inst.server_id));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleFavorite = async (serverId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (favorites.includes(serverId)) {
        await removeFromFavorites(serverId);
        setFavorites(favorites.filter(id => id !== serverId));
        addToast({
          type: 'info',
          title: 'Removed from favorites',
          message: 'Server removed from your favorites list'
        });
      } else {
        await addToFavorites(serverId);
        setFavorites([...favorites, serverId]);
        addToast({
          type: 'success',
          title: 'Added to favorites',
          message: 'Server added to your favorites list'
        });
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      addToast({
        type: 'error',
        title: 'Failed to update favorites',
        message: 'Please try again'
      });
    }
  };

  const handleInstall = async (serverId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      await installServer(serverId);
      setInstallations([...installations, serverId]);
      // Reload servers to update download count
      loadServers();
      addToast({
        type: 'success',
        title: 'Server installed',
        message: 'Server has been successfully installed'
      });
    } catch (error) {
      console.error('Error installing server:', error);
      addToast({
        type: 'error',
        title: 'Installation failed',
        message: 'Please try again'
      });
    }
  };

  const addToOrchestration = (serverId: string) => {
    if (!orchestrationServers.includes(serverId)) {
      setOrchestrationServers([...orchestrationServers, serverId]);
      addToast({
        type: 'success',
        title: 'Added to chain',
        message: 'Server added to orchestration chain'
      });
    }
  };

  const removeFromOrchestration = (serverId: string) => {
    setOrchestrationServers(orchestrationServers.filter(id => id !== serverId));
    addToast({
      type: 'info',
      title: 'Removed from chain',
      message: 'Server removed from orchestration chain'
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    addToast({
      type: 'info',
      title: 'Signed out',
      message: 'You have been successfully signed out'
    });
  };

  const handleViewDetails = (server: MCPServer) => {
    setSelectedServer(server);
    setShowServerDetail(true);
  };

  const handleExecutionComplete = (results: any[]) => {
    const successCount = results.filter(r => r.status === 'completed').length;
    addToast({
      type: successCount === results.length ? 'success' : 'warning',
      title: 'Chain execution completed',
      message: `${successCount}/${results.length} steps completed successfully`
    });
  };

  const handleSearchResults = (results: MCPServer[]) => {
    setFilteredServers(results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-colors duration-300">
      {/* Official Built with Bolt.new Badge */}
      <div className="fixed bottom-4 right-4 z-40">
        <a
          href="https://bolt.new"
          target="_blank"
          rel="noopener noreferrer"
          className="group block transition-all duration-300 hover:scale-105"
        >
          {/* Use black circle for light backgrounds, white circle for dark backgrounds */}
          <img
            src="/black_circle_360x360.png"
            alt="Built with Bolt.new"
            className="w-16 h-16 dark:hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
          />
          <img
            src="/white_circle_360x360.png"
            alt="Built with Bolt.new"
            className="w-16 h-16 hidden dark:block shadow-lg hover:shadow-xl transition-shadow duration-300"
          />
        </a>
      </div>

      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  MCPHub
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">The NPM for MCP</p>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              {[
                { id: 'discover', label: 'Discover', icon: Search },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'orchestrate', label: 'Orchestrate', icon: Zap },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'discover' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center py-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Discover Secure MCP Servers
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Find, validate, and deploy production-ready MCP servers from our curated registry. 
                Every server is security-scanned and performance-tested.
              </p>
              
              {/* Advanced Search Component */}
              <AdvancedSearch 
                onResults={handleSearchResults}
                onLoading={setSearchLoading}
              />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Servers', value: servers.length.toString(), icon: Server, color: 'blue' },
                { label: 'Security Scans', value: '15.2K', icon: Shield, color: 'green' },
                { label: 'Active Users', value: user ? '8,935' : '8,934', icon: Users, color: 'purple' },
                { label: 'Deployments', value: '156K', icon: TrendingUp, color: 'orange' }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                      color === 'blue' ? 'from-blue-500 to-blue-600' :
                      color === 'green' ? 'from-green-500 to-green-600' :
                      color === 'purple' ? 'from-purple-500 to-purple-600' :
                      'from-orange-500 to-orange-600'
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MCP Servers Grid */}
            {loading || searchLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" className="mx-auto" />
                <p className="text-gray-600 dark:text-gray-400 mt-4">Loading servers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServers.map(server => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    isFavorited={favorites.includes(server.id)}
                    isInstalled={installations.includes(server.id)}
                    onFavorite={handleFavorite}
                    onInstall={handleInstall}
                    onAddToChain={addToOrchestration}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <SecurityDashboard 
            servers={servers}
            onScanComplete={loadServers}
          />
        )}

        {activeTab === 'orchestrate' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">MCP Orchestration Playground</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">Chain multiple MCP servers together with intelligent execution and real-time monitoring</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Servers</h3>
                <div className="space-y-3">
                  {servers.slice(0, 5).map(server => (
                    <div key={server.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{server.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{server.category}</p>
                      </div>
                      <button
                        onClick={() => addToOrchestration(server.id)}
                        disabled={orchestrationServers.includes(server.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {orchestrationServers.includes(server.id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Orchestration Chain</h3>
                  {orchestrationServers.length > 0 && (
                    <button
                      onClick={() => setOrchestrationServers([])}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {orchestrationServers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>Add servers to create your orchestration chain</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orchestrationServers.map((serverId, index) => {
                      const server = servers.find(s => s.id === serverId);
                      return (
                        <div key={serverId} className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{server?.name}</p>
                          </div>
                          <button
                            onClick={() => removeFromOrchestration(serverId)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            ×
                          </button>
                          {index < orchestrationServers.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Orchestration Executor */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Execution Engine</h3>
              <OrchestrationExecutor
                servers={servers}
                orchestrationServers={orchestrationServers}
                onExecutionComplete={handleExecutionComplete}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Analytics Dashboard</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">Monitor performance, usage, and costs across your MCP infrastructure</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Connections', value: '1,247', change: '+12%', color: 'green' },
                { label: 'Avg Response Time', value: '145ms', change: '-8%', color: 'blue' },
                { label: 'Monthly Cost', value: '$89.50', change: '+5%', color: 'orange' },
                { label: 'Success Rate', value: '99.8%', change: '+0.1%', color: 'green' }
              ].map(({ label, value, change, color }) => (
                <div key={label} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{value}</p>
                  <p className={`text-sm ${
                    color === 'green' ? 'text-green-600 dark:text-green-400' : 
                    color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 
                    'text-orange-600 dark:text-orange-400'
                  }`}>
                    {change} from last month
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Servers</h3>
                <div className="space-y-4">
                  {servers.slice(0, 5).map((server, index) => (
                    <div key={server.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{server.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{server.downloads.toLocaleString()} downloads</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{server.rating}/5.0</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">rating</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Trends</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">API Calls Today</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">12,847</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Data Transferred</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">2.4 GB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Server Uptime</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">99.97%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Active Users</span>
                    <span className="font-semibled text-orange-600 dark:text-orange-400">{user ? '1,835' : '1,834'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          loadUserData();
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
      />

      <ServerDetailModal
        server={selectedServer}
        isOpen={showServerDetail}
        onClose={() => setShowServerDetail(false)}
        isFavorited={selectedServer ? favorites.includes(selectedServer.id) : false}
        isInstalled={selectedServer ? installations.includes(selectedServer.id) : false}
        onFavorite={handleFavorite}
        onInstall={handleInstall}
        onAddToChain={addToOrchestration}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;