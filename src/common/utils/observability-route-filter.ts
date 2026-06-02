import { Request } from 'express';

export function getRequestUrl(
  req: Pick<Request, 'originalUrl' | 'baseUrl' | 'url'>,
): string {
  return req.originalUrl || `${req.baseUrl || ''}${req.url}` || req.url;
}

export function shouldSkipObservabilityRoute(
  requestUrl: string,
  userAgent = '',
): boolean {
  const path = requestUrl.split('?')[0];

  const isHealthOrMonitoringPath =
    path.startsWith('/api/v1/health') ||
    path.startsWith('/health') ||
    path.startsWith('/api/v1/metrics') ||
    path.startsWith('/metrics') ||
    path.startsWith('/api/v1/performance') ||
    path.startsWith('/performance');

  if (isHealthOrMonitoringPath) {
    return true;
  }

  // Some probe/scraper requests can be seen as '/' in middleware after route mounting.
  const isProbeUserAgent =
    /(kube-probe|prometheus|grafana-agent|otel-collector|blackbox)/i.test(
      userAgent,
    );
  return path === '/' && isProbeUserAgent;
}
