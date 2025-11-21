import { Handler } from '@netlify/functions';

const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || 'changeme123';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

interface AnalyticsEvent {
  type: 'pageview' | 'download' | 'export' | 'session_end';
  timestamp: number;
  sessionId: string;
  data?: any;
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

  if (!REDIS_URL || !REDIS_TOKEN) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Redis not configured. See ANALYTICS_SETUP.md' })
    };
  }

  try {
    // Get all events from Redis sorted set
    const response = await fetch(`${REDIS_URL}/zrange/analytics_events/0/-1`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from Redis');
    }

    const redisData = await response.json();
    const events: AnalyticsEvent[] = (redisData.result || []).map((eventStr: string) => JSON.parse(eventStr));

    // Calculate summary statistics
    const summary: AnalyticsSummary = {
      totalVisits: events.filter(e => e.type === 'pageview').length,
      uniqueSessions: new Set(events.map(e => e.sessionId)).size,
      totalDownloads: events.filter(e => e.type === 'export').length,
      avgTimeOnPage: 0,
      recentActivity: events.slice(-50).reverse().map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        data: e.data
      })),
      downloadsByType: {
        base: events.filter(e => e.type === 'export' && e.data?.exportType === 'base').length,
        code: events.filter(e => e.type === 'export' && e.data?.exportType === 'code').length,
        combined: events.filter(e => e.type === 'export' && e.data?.exportType === 'combined').length,
      }
    };

    // Calculate average time on page
    const sessionEndEvents = events.filter(e => e.type === 'session_end' && e.data?.timeOnPage);
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
