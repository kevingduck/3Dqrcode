import React, { useEffect } from 'react';
import App from './App';
import AnalyticsPage from './components/AnalyticsPage';
import { initAnalytics } from './utils/analytics';

const Router: React.FC = () => {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  useEffect(() => {
    // Initialize analytics only for main app (not analytics page)
    if (currentPath === '/' || currentPath === '/index.html') {
      initAnalytics();
    }

    // Handle browser back/forward buttons
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPath]);

  // Simple client-side routing
  if (currentPath === '/analytics') {
    return <AnalyticsPage />;
  }

  return <App />;
};

export default Router;
