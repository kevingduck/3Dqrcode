import { Handler } from '@netlify/functions';

interface AnalyticsEvent {
  type: 'pageview' | 'download' | 'export' | 'session_end';
  timestamp: number;
  sessionId: string;
  data?: {
    page?: string;
    timeOnPage?: number;
    exportType?: string;
    [key: string]: any;
  };
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Redis not configured. See ANALYTICS_SETUP.md' })
    };
  }

  try {
    const analyticsEvent: AnalyticsEvent = JSON.parse(event.body || '{}');

    // Add event to Redis sorted set (sorted by timestamp)
    const score = analyticsEvent.timestamp;
    const member = JSON.stringify(analyticsEvent);

    // Use Upstash REST API
    const addResponse = await fetch(`${REDIS_URL}/zadd/analytics_events/${score}/${encodeURIComponent(member)}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!addResponse.ok) {
      throw new Error('Failed to add event to Redis');
    }

    // Keep only last 10,000 events
    await fetch(`${REDIS_URL}/zremrangebyrank/analytics_events/0/-10001`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to track event' })
    };
  }
};
