import React, { useState, useEffect } from 'react';
import { 
  X, User, Bell, Shield, Palette, Globe, Download, 
  Eye, EyeOff, Save, RefreshCw, Trash2, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function SettingsModal({ isOpen, onClose, user }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({
    // Profile settings
    displayName: '',
    email: '',
    bio: '',
    
    // Notification settings
    emailNotifications: true,
    securityAlerts: true,
    updateNotifications: false,
    marketingEmails: false,
    
    // Privacy settings
    profileVisibility: 'public',
    showInstallations: true,
    showFavorites: true,
    analyticsOptOut: false,
    
    // Appearance settings
    theme: 'light',
    compactMode: false,
    animationsEnabled: true,
    
    // Security settings
    twoFactorEnabled: false,
    sessionTimeout: 30,
    downloadConfirmation: true
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadUserSettings();
    }
  }, [user, isOpen]);

  // Apply theme when settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for system theme changes when theme is set to 'auto'
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

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
  };

  const loadUserSettings = async () => {
    try {
      // Load user profile data
      setSettings(prev => ({
        ...prev,
        displayName: user.user_metadata?.display_name || '',
        email: user.email || ''
      }));
      
      // Load settings from localStorage
      const savedSettings = localStorage.getItem(`mcphub_settings_${user.id}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } else {
        // Load system theme preference if no saved settings
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setSettings(prev => ({ ...prev, theme: 'auto' }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem(`mcphub_settings_${user.id}`, JSON.stringify(settings));
      
      // Update user metadata if profile changed
      if (settings.displayName !== user.user_metadata?.display_name) {
        await supabase.auth.updateUser({
          data: { display_name: settings.displayName }
        });
      }
      
      // Apply theme immediately
      applyTheme(settings.theme);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    const defaultSettings = {
      displayName: user.user_metadata?.display_name || '',
      email: user.email || '',
      bio: '',
      emailNotifications: true,
      securityAlerts: true,
      updateNotifications: false,
      marketingEmails: false,
      profileVisibility: 'public',
      showInstallations: true,
      showFavorites: true,
      analyticsOptOut: false,
      theme: 'light',
      compactMode: false,
      animationsEnabled: true,
      twoFactorEnabled: false,
      sessionTimeout: 30,
      downloadConfirmation: true
    };
    
    setSettings(defaultSettings);
    applyTheme('light');
  };

  const deleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        // In production, you'd call an API to delete the account
        console.log('Account deletion requested');
        alert('Account deletion request submitted. You will receive an email confirmation.');
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={settings.displayName}
                      onChange={(e) => setSettings(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Your display name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed here</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={settings.bio}
                    onChange={(e) => setSettings(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'securityAlerts', label: 'Security Alerts', description: 'Get notified about security issues' },
                    { key: 'updateNotifications', label: 'Update Notifications', description: 'Notifications about server updates' },
                    { key: 'marketingEmails', label: 'Marketing Emails', description: 'Promotional emails and newsletters' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profile Visibility
                    </label>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => setSettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>
                  
                  {[
                    { key: 'showInstallations', label: 'Show Installations', description: 'Display your installed servers publicly' },
                    { key: 'showFavorites', label: 'Show Favorites', description: 'Display your favorite servers publicly' },
                    { key: 'analyticsOptOut', label: 'Opt out of Analytics', description: 'Disable usage analytics collection' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Light', icon: '☀️' },
                        { value: 'dark', label: 'Dark', icon: '🌙' },
                        { value: 'auto', label: 'System', icon: '💻' }
                      ].map(({ value, label, icon }) => (
                        <button
                          key={value}
                          onClick={() => handleThemeChange(value)}
                          className={`p-4 border rounded-lg text-center transition-colors ${
                            settings.theme === value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="text-2xl mb-2">{icon}</div>
                          <div className="font-medium">{label}</div>
                          {value === 'auto' && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Follows system
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {[
                    { key: 'compactMode', label: 'Compact Mode', description: 'Use a more compact interface layout' },
                    { key: 'animationsEnabled', label: 'Enable Animations', description: 'Show smooth transitions and animations' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
                
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        settings.twoFactorEnabled 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Add an extra layer of security to your account</p>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        settings.twoFactorEnabled
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <select
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Download Confirmation</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Require confirmation before downloading servers</p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, downloadConfirmation: !prev.downloadConfirmation }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.downloadConfirmation ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.downloadConfirmation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">Danger Zone</h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={deleteAccount}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={resetSettings}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset to Defaults</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}