import { Handler, HandlerContext } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

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

interface AnalyticsStore {
  events: AnalyticsEvent[];
  lastUpdated: number;
}

export const handler: Handler = async (event, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const analyticsEvent: AnalyticsEvent = JSON.parse(event.body || '{}');

    // Get store (auto-configured in Netlify environment)
    const store = getStore('analytics');

    // Get existing data or initialize
    let data: AnalyticsStore;
    try {
      data = await store.get('data', { type: 'json' }) || { events: [], lastUpdated: Date.now() };
    } catch {
      data = { events: [], lastUpdated: Date.now() };
    }

    // Add new event
    data.events.push(analyticsEvent);
    data.lastUpdated = Date.now();

    // Keep only last 10,000 events to stay within limits
    if (data.events.length > 10000) {
      data.events = data.events.slice(-10000);
    }

    // Save back to store
    await store.setJSON('data', data);

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
      body: JSON.stringify({ error: 'Failed to track event', details: String(error) })
    };
  }
};
