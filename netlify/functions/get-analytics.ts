import { Handler } from '@netlify/functions';

// Set your password here (in production, use environment variable)
const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || 'changeme123';

interface AnalyticsEvent {
  type: 'pageview' | 'download' | 'export' | 'session_end';
  timestamp: number;
  sessionId: string;
  data?: any;
}

interface AnalyticsStore {
  events: AnalyticsEvent[];
  lastUpdated: number;
}

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

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check password
  const authHeader = event.headers.authorization;
  const password = authHeader?.replace('Bearer ', '');

  if (password !== ANALYTICS_PASSWORD) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Invalid password' })
    };
  }

  try {
    // Get analytics data
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('analytics');
    const data: AnalyticsStore = await store.get('data', { type: 'json' }) || { events: [], lastUpdated: 0 };

    // Calculate summary statistics
    const summary: AnalyticsSummary = {
      totalVisits: data.events.filter(e => e.type === 'pageview').length,
      uniqueSessions: new Set(data.events.map(e => e.sessionId)).size,
      totalDownloads: data.events.filter(e => e.type === 'export').length,
      avgTimeOnPage: 0,
      recentActivity: data.events.slice(-50).reverse().map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        data: e.data
      })),
      downloadsByType: {
        base: data.events.filter(e => e.type === 'export' && e.data?.exportType === 'base').length,
        code: data.events.filter(e => e.type === 'export' && e.data?.exportType === 'code').length,
        combined: data.events.filter(e => e.type === 'export' && e.data?.exportType === 'combined').length,
      }
    };

    // Calculate average time on page
    const sessionEndEvents = data.events.filter(e => e.type === 'session_end' && e.data?.timeOnPage);
    if (sessionEndEvents.length > 0) {
      const totalTime = sessionEndEvents.reduce((sum, e) => sum + (e.data?.timeOnPage || 0), 0);
      summary.avgTimeOnPage = Math.round(totalTime / sessionEndEvents.length);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(summary)
    };
  } catch (error) {
    console.error('Analytics retrieval error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to retrieve analytics' })
    };
  }
};
