import * as Sentry from '@sentry/node';
import logger from './logger.js';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn.includes('xxxxx')) {
    logger.info('Sentry: ○ desactivado (sin DSN configurado)');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  });

  logger.info('Sentry: ✓ activado');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSentryErrorHandler(): any {
  return Sentry.expressErrorHandler();
}

export { Sentry };
