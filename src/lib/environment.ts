import type { EnvironmentInfo } from './types';

/**
 * Popup context'inden ortam bilgilerini toplar.
 * NOT: url alanı popup URL'ini döner — aktif tab URL'i dışarıdan enjekte edilmeli.
 */
export function collectEnvironmentInfo(): EnvironmentInfo {
  const ua = navigator.userAgent;

  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const browser = chromeMatch ? `Chrome ${chromeMatch[1]}` : 'Chrome';

  let os = 'Unknown';
  if (ua.includes('Windows NT')) os = 'Windows 10/11';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    browser,
    os,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
    language: navigator.language,
    url: window.location?.href ?? '',
  };
}
