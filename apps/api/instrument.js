// Sentry error tracking — imported FIRST in server.js so instrumentation is in
// place before any other module loads. No-ops entirely when SENTRY_DSN is unset
// (local dev, or before the owner adds the DSN in Render), so it's always safe
// to keep imported.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Modest trace sampling — enough to spot slow endpoints without burning the
    // free-tier event quota.
    tracesSampleRate: 0.1,
    // Never ship PII to Sentry: strip auth headers / cookies from captured events.
    sendDefaultPii: false,
  });
  console.log('[sentry] initialized');
} else {
  console.log('[sentry] SENTRY_DSN not set — error tracking disabled');
}

export { Sentry };
