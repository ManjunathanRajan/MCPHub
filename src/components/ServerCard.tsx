import React, { useState } from 'react';
import { 
  MessageSquare, Code, Database, Zap, TrendingUp, 
  CheckCircle, Download, Star, Clock, Heart, 
  ExternalLink, Copy, Check, Eye
} from 'lucide-react';
import type { MCPServer } from '../types/database';

interface ServerCardProps {
  server: MCPServer;
  isFavorited: boolean;
  isInstalled: boolean;
  onFavorite: (serverId: string) => void;
  onInstall: (serverId: string) => void;
  onAddToChain: (serverId: string) => void;
  onViewDetails: (server: MCPServer) => void;
}

export default function ServerCard({ 
  server, 
  isFavorited, 
  isInstalled, 
  onFavorite, 
  onInstall, 
  onAddToChain,
  onViewDetails
}: ServerCardProps) {
  const [copied, setCopied] = useState(false);

  const getSecurityColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-50';
    if (score >= 90) return 'text-blue-600 bg-blue-50';
    if (score >= 85) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Communication': return MessageSquare;
      case 'Development': return Code;
      case 'Database': return Database;
      case 'Productivity': return Zap;
      case 'Finance': return TrendingUp;
      default: return Code;
    }
  };

  const handleCopyInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (server.install_command) {
      await navigator.clipboard.writeText(server.install_command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const Icon = getCategoryIcon(server.category);

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{server.name}</h3>
              {server.verified && <CheckCircle className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-sm text-gray-600">by {server.author}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getSecurityColor(server.security_score)}`}>
          {server.security_score}/100
        </div>
      </div>

      <p className="text-gray-700 mb-4 leading-relaxed line-clamp-2">{server.description}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {server.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
            {tag}
          </span>
        ))}
        {server.tags.length > 3 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
            +{server.tags.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Download className="w-4 h-4" />
            <span>{server.downloads.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{server.rating}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatLastUpdated(server.last_updated)}</span>
          </div>
        </div>
      </div>

      {server.install_command && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <code className="text-sm text-gray-800 font-mono truncate flex-1 mr-2">
              {server.install_command}
            </code>
            <button
              onClick={handleCopyInstall}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall(server.id);
            }}
            disabled={isInstalled}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isInstalled 
                ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isInstalled ? 'Installed' : 'Install'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddToChain(server.id);
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            + Chain
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(server);
            }}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            Details
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {server.github_url && (
            <a
              href={server.github_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(server.id);
            }}
            className={`p-2 transition-colors ${
              isFavorited ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}