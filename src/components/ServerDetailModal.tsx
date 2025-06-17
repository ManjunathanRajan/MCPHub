import React, { useState } from 'react';
import { 
  X, ExternalLink, Copy, Check, Star, Download, Shield, 
  Clock, User, Tag, Code, BookOpen, GitBranch, AlertTriangle,
  CheckCircle, Zap, Heart, Play
} from 'lucide-react';
import type { MCPServer } from '../types/database';

interface ServerDetailModalProps {
  server: MCPServer | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorited: boolean;
  isInstalled: boolean;
  onFavorite: (serverId: string) => void;
  onInstall: (serverId: string) => void;
  onAddToChain: (serverId: string) => void;
}

export default function ServerDetailModal({
  server,
  isOpen,
  onClose,
  isFavorited,
  isInstalled,
  onFavorite,
  onInstall,
  onAddToChain
}: ServerDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !server) return null;

  const handleCopyInstall = async () => {
    if (server.install_command) {
      await navigator.clipboard.writeText(server.install_command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSecurityColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 90) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 85) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'installation', label: 'Installation', icon: Code },
    { id: 'documentation', label: 'Documentation', icon: BookOpen },
    { id: 'versions', label: 'Versions', icon: GitBranch }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Code className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h2 className="text-2xl font-bold">{server.name}</h2>
                  {server.verified && <CheckCircle className="w-6 h-6 text-blue-200" />}
                </div>
                <p className="text-blue-100 mb-2">by {server.author}</p>
                <div className="flex items-center space-x-4 text-sm text-blue-100">
                  <div className="flex items-center space-x-1">
                    <Download className="w-4 h-4" />
                    <span>{server.downloads.toLocaleString()} downloads</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-300" />
                    <span>{server.rating}/5.0</span>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getSecurityColor(server.security_score)}`}>
                    <Shield className="w-3 h-3 inline mr-1" />
                    {server.security_score}/100
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <button
                onClick={() => onInstall(server.id)}
                disabled={isInstalled}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isInstalled 
                    ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isInstalled ? (
                  <>
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Installed
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 inline mr-2" />
                    Install
                  </>
                )}
              </button>
              <button 
                onClick={() => onAddToChain(server.id)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Add to Chain
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onFavorite(server.id)}
                className={`p-2 transition-colors rounded-lg ${
                  isFavorited 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              {server.github_url && (
                <a
                  href={server.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{server.description}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Tag className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Category</span>
                    </div>
                    <span className="text-gray-700">{server.category}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Last Updated</span>
                    </div>
                    <span className="text-gray-700">{formatLastUpdated(server.last_updated)}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Author</span>
                    </div>
                    <span className="text-gray-700">{server.author}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Security Score</span>
                    </div>
                    <span className={`font-semibold ${
                      server.security_score >= 95 ? 'text-green-600' :
                      server.security_score >= 90 ? 'text-blue-600' :
                      server.security_score >= 85 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {server.security_score}/100
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {server.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Compatibility</h3>
                <div className="flex flex-wrap gap-2">
                  {server.compatibility.map(comp => (
                    <span key={comp} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'installation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Install</h3>
                {server.install_command ? (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Terminal</span>
                      <button
                        onClick={handleCopyInstall}
                        className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <code className="text-green-400 font-mono">{server.install_command}</code>
                  </div>
                ) : (
                  <p className="text-gray-600">Installation instructions not available.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-blue-800 font-medium">System Requirements</p>
                      <ul className="text-blue-700 text-sm mt-1 space-y-1">
                        <li>• Node.js 16+ or compatible runtime</li>
                        <li>• Compatible with: {server.compatibility.join(', ')}</li>
                        <li>• Network access for API calls</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">Basic configuration example:</p>
                  <div className="bg-gray-900 rounded p-3">
                    <code className="text-green-400 font-mono text-sm">
{`{
  "mcpServers": {
    "${server.name}": {
      "command": "node",
      "args": ["path/to/${server.name}"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}`}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documentation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">API Reference</h3>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Available Tools</h4>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-3">
                        <code className="text-sm font-mono text-gray-800">get_data(query: string)</code>
                        <p className="text-gray-600 text-sm mt-1">Retrieve data based on query parameters</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <code className="text-sm font-mono text-gray-800">update_resource(id: string, data: object)</code>
                        <p className="text-gray-600 text-sm mt-1">Update existing resource with new data</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <code className="text-sm font-mono text-gray-800">list_resources(filters?: object)</code>
                        <p className="text-gray-600 text-sm mt-1">List all available resources with optional filtering</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Usage Examples</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 font-mono text-sm overflow-x-auto">
{`// Example usage
const client = new MCPClient('${server.name}');

// Get data
const result = await client.get_data('user:123');

// Update resource  
await client.update_resource('item:456', {
  name: 'Updated Item',
  status: 'active'
});

// List resources
const items = await client.list_resources({
  category: '${server.category.toLowerCase()}'
});`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Error Handling</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    Always implement proper error handling when using this server. 
                    Check the response status and handle network errors gracefully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Version History</h3>
                <div className="space-y-4">
                  {[
                    { version: '2.1.4', date: '2024-01-15', changes: ['Security improvements', 'Bug fixes', 'Performance optimizations'] },
                    { version: '2.1.3', date: '2024-01-10', changes: ['Added new API endpoints', 'Updated documentation'] },
                    { version: '2.1.2', date: '2024-01-05', changes: ['Fixed authentication issues', 'Improved error handling'] },
                    { version: '2.1.1', date: '2023-12-28', changes: ['Minor bug fixes', 'Updated dependencies'] }
                  ].map((release, index) => (
                    <div key={release.version} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">v{release.version}</span>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Latest</span>
                          )}
                        </div>
                        <span className="text-gray-500 text-sm">{release.date}</span>
                      </div>
                      <ul className="text-gray-700 text-sm space-y-1">
                        {release.changes.map((change, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}