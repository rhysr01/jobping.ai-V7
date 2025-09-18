/**
 * Sentry Client Configuration
 * 
 * This file configures Sentry for client-side error tracking in the browser.
 * It's automatically loaded by the Sentry Next.js plugin.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '1.0.0',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay disabled (unsupported in current SDK version)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  
  // Enhanced error filtering for client-side
  beforeSend(event, hint) {
    // Filter out common client-side noise
    const error = hint.originalException;
    
    if (error instanceof Error) {
      // Filter out network errors that are user-environment related
      if (error.message.includes('Network request failed') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('Load failed')) {
        return null;
      }
      
      // Filter out extension errors
      if (error.stack?.includes('extension://') ||
          error.stack?.includes('chrome-extension://') ||
          error.stack?.includes('moz-extension://')) {
        return null;
      }
      
      // Filter out script errors from external domains
      if (error.message === 'Script error.' && 
          !event.exception?.values?.[0]?.stacktrace?.frames?.some(frame => 
            frame.filename?.includes('jobping.ai') || 
            frame.filename?.includes('localhost')
          )) {
        return null;
      }
    }
    
    return event;
  },
  
  // Integration configuration
  integrations: [],
  
  // Additional client-side configuration
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy navigation breadcrumbs
    if (breadcrumb.category === 'navigation' && 
        breadcrumb.data?.from === breadcrumb.data?.to) {
      return null;
    }
    
    // Filter out console breadcrumbs in production
    if (process.env.NODE_ENV === 'production' && 
        breadcrumb.category === 'console') {
      return null;
    }
    
    return breadcrumb;
  },
  
  // Rely on default unhandled rejection handling
  
  // Additional tags for client context
  initialScope: {
    tags: {
      component: 'frontend',
    },
  },
});
