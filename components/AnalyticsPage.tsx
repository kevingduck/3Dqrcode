import React, { useState, useEffect } from 'react';
import { Lock, Users, Download, Clock, Activity } from 'lucide-react';

interface AnalyticsSummary {
  totalVisits: number;
  uniqueSessions: number;
  totalDownloads: number;
  avgTimeOnPage: number;
  recentActivity: Array<{
    type: string;
    timestamp: number;
    data?: any;
  }>;
  downloadsByType: {
    base: number;
    code: number;
    combined: number;
  };
}

const AnalyticsPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/get-analytics', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        setIsAuthenticated(true);
        localStorage.setItem('analyticsAuth', password);
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to auto-login with saved password
    const savedPassword = localStorage.getItem('analyticsAuth');
    if (savedPassword) {
      setPassword(savedPassword);
      handleLogin({ preventDefault: () => {} } as React.FormEvent);
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-200 text-center mb-6">
            Analytics Dashboard
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter password"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Access Analytics'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">3D QR Forge Analytics</h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem('analyticsAuth');
            }}
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Logout
          </button>
        </div>

        {analytics && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-medium text-slate-400">Total Visits</h3>
                </div>
                <p className="text-3xl font-bold">{analytics.totalVisits}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  <h3 className="text-sm font-medium text-slate-400">Unique Sessions</h3>
                </div>
                <p className="text-3xl font-bold">{analytics.uniqueSessions}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Download className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-medium text-slate-400">Total Downloads</h3>
                </div>
                <p className="text-3xl font-bold">{analytics.totalDownloads}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <h3 className="text-sm font-medium text-slate-400">Avg Time on Page</h3>
                </div>
                <p className="text-3xl font-bold">{formatDuration(analytics.avgTimeOnPage)}</p>
              </div>
            </div>

            {/* Downloads by Type */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Downloads by Type</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Base STL</p>
                  <p className="text-2xl font-bold text-blue-400">{analytics.downloadsByType.base}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Code STL</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.downloadsByType.code}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Combined STL</p>
                  <p className="text-2xl font-bold text-purple-400">{analytics.downloadsByType.combined}</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-2">
                {analytics.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        activity.type === 'pageview' ? 'bg-blue-400' :
                        activity.type === 'export' ? 'bg-green-400' :
                        'bg-slate-500'
                      }`}></span>
                      <span className="text-sm">
                        {activity.type === 'pageview' && 'Page Visit'}
                        {activity.type === 'export' && `Downloaded ${activity.data?.exportType || 'STL'}`}
                        {activity.type === 'session_end' && `Session ended (${formatDuration(activity.data?.timeOnPage || 0)})`}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
