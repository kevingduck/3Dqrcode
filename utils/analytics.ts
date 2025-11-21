// Simple analytics tracking utility

let sessionId: string;
let sessionStartTime: number;

// Generate or retrieve session ID
const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Track an analytics event
export const trackEvent = async (
  type: 'pageview' | 'download' | 'export' | 'session_end',
  data?: any
) => {
  try {
    await fetch('/.netlify/functions/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        timestamp: Date.now(),
        sessionId: getSessionId(),
        data
      })
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.debug('Analytics tracking failed:', error);
  }
};

// Track page view
export const trackPageView = (page: string = '/') => {
  trackEvent('pageview', { page });
};

// Track STL export
export const trackExport = (exportType: 'base' | 'code' | 'combined') => {
  trackEvent('export', { exportType });
};

// Track session end with time on page
export const trackSessionEnd = () => {
  if (!sessionStartTime) {
    sessionStartTime = Date.now();
  }
  const timeOnPage = Math.floor((Date.now() - sessionStartTime) / 1000);
  trackEvent('session_end', { timeOnPage });
};

// Initialize session tracking
export const initAnalytics = () => {
  sessionStartTime = Date.now();
  trackPageView();

  // Track session end on page unload
  window.addEventListener('beforeunload', trackSessionEnd);

  // Track session end on visibility change (when user switches tabs/minimizes)
  let visibilityTimeout: NodeJS.Timeout;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Wait 30 seconds before considering it a session end
      visibilityTimeout = setTimeout(trackSessionEnd, 30000);
    } else {
      // User came back, cancel the timeout
      clearTimeout(visibilityTimeout);
    }
  });
};
