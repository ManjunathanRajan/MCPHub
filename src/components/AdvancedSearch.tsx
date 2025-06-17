import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Shield, Star, Download, Clock, Zap } from 'lucide-react';
import { searchMCPServers } from '../lib/supabase';
import type { MCPServer } from '../types/database';

interface AdvancedSearchProps {
  onResults: (servers: MCPServer[]) => void;
  onLoading: (loading: boolean) => void;
}

export default function AdvancedSearch({ onResults, onLoading }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [minSecurityScore, setMinSecurityScore] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('downloads');
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const categories = ['all', 'Communication', 'Development', 'Database', 'Productivity', 'Finance', 'AI/ML'];

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('mcphub_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, minSecurityScore, verifiedOnly, sortBy]);

  const handleSearch = async () => {
    onLoading(true);
    try {
      const { data, error } = await searchMCPServers(
        query,
        category,
        minSecurityScore,
        verifiedOnly
      );

      if (error) throw error;

      let results = data || [];

      // Apply client-side sorting since the database function handles basic ordering
      switch (sortBy) {
        case 'rating':
          results.sort((a, b) => b.rating - a.rating);
          break;
        case 'security':
          results.sort((a, b) => b.security_score - a.security_score);
          break;
        case 'updated':
          results.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
          break;
        case 'trust':
          results.sort((a, b) => (b.trust_score || 50) - (a.trust_score || 50));
          break;
        default: // downloads
          results.sort((a, b) => b.downloads - a.downloads);
      }

      onResults(results);

      // Save to search history if it's a meaningful query
      if (query.trim() && query.length > 2) {
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem('mcphub_search_history', JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Search error:', error);
      onResults([]);
    } finally {
      onLoading(false);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setMinSecurityScore(0);
    setVerifiedOnly(false);
    setSortBy('downloads');
  };

  const hasActiveFilters = category !== 'all' || minSecurityScore > 0 || verifiedOnly || sortBy !== 'downloads';

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search MCP servers... (e.g., 'Slack integration', 'PostgreSQL', 'AI assistant')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-16 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg bg-white/80 backdrop-blur-sm"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && query === '' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Recent:</span>
          {searchHistory.map((historyQuery, index) => (
            <button
              key={index}
              onClick={() => setQuery(historyQuery)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
            >
              {historyQuery}
            </button>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Clear all</span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Security Score Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Security Score: {minSecurityScore}
              </label>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minSecurityScore}
                  onChange={(e) => setMinSecurityScore(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>100</span>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="downloads">Most Downloaded</option>
                <option value="rating">Highest Rated</option>
                <option value="security">Security Score</option>
                <option value="updated">Recently Updated</option>
                <option value="trust">Trust Score</option>
              </select>
            </div>

            {/* Additional Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-500">Quick filters:</span>
            <button
              onClick={() => {
                setMinSecurityScore(95);
                setVerifiedOnly(true);
              }}
              className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full hover:bg-green-200 transition-colors"
            >
              <Shield className="w-3 h-3 inline mr-1" />
              High Security
            </button>
            <button
              onClick={() => {
                setSortBy('rating');
                setMinSecurityScore(90);
              }}
              className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full hover:bg-yellow-200 transition-colors"
            >
              <Star className="w-3 h-3 inline mr-1" />
              Top Rated
            </button>
            <button
              onClick={() => {
                setSortBy('downloads');
                setMinSecurityScore(85);
              }}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full hover:bg-blue-200 transition-colors"
            >
              <Download className="w-3 h-3 inline mr-1" />
              Popular
            </button>
            <button
              onClick={() => {
                setSortBy('updated');
                setCategory('all');
              }}
              className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full hover:bg-purple-200 transition-colors"
            >
              <Clock className="w-3 h-3 inline mr-1" />
              Fresh
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">Active filters:</span>
          {category !== 'all' && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center space-x-1">
              <span>{category}</span>
              <button onClick={() => setCategory('all')} className="hover:bg-blue-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {minSecurityScore > 0 && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Security {minSecurityScore}+</span>
              <button onClick={() => setMinSecurityScore(0)} className="hover:bg-green-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {verifiedOnly && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full flex items-center space-x-1">
              <span>Verified</span>
              <button onClick={() => setVerifiedOnly(false)} className="hover:bg-purple-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sortBy !== 'downloads' && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center space-x-1">
              <span>Sort: {sortBy}</span>
              <button onClick={() => setSortBy('downloads')} className="hover:bg-gray-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}