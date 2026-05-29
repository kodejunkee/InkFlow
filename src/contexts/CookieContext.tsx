/**
 * CookieContext — Provides Cloudflare cookies to the entire Browse system.
 *
 * Wraps the Browse tab with a cookie provider that handles:
 * - Initial Cloudflare challenge solving via hidden WebView
 * - Cookie storage and refresh
 * - Connection status tracking
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { CookieStatus } from '../types/novel';
import CloudflareBypasser from '../components/novel/CloudflareBypasser';

interface CookieContextValue {
  cookies: string;
  userAgent: string;
  status: CookieStatus;
  refreshCookies: () => void;
}

const CookieCtx = createContext<CookieContextValue>({
  cookies: '',
  userAgent: '',
  status: 'idle',
  refreshCookies: () => {},
});

/** Access Cloudflare cookies from any child component. */
export function useCookies(): CookieContextValue {
  return useContext(CookieCtx);
}

interface Props {
  sourceUrl: string;
  children: React.ReactNode;
}

export function CookieProvider({ sourceUrl, children }: Props) {
  const [cookies, setCookies] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [status, setStatus] = useState<CookieStatus>('connecting');
  const [bypasserKey, setBypasserKey] = useState(0);
  const retryCount = useRef(0);

  const handleCookiesReady = useCallback((c: string, ua: string) => {
    setCookies(c);
    setUserAgent(ua);
    setStatus('ready');
    retryCount.current = 0;
  }, []);

  const handleError = useCallback((error: string) => {
    console.warn('[CookieProvider] Error:', error);
    if (retryCount.current < 3) {
      retryCount.current += 1;
      // Retry by remounting the WebView
      setBypasserKey((k) => k + 1);
    } else {
      setStatus('error');
    }
  }, []);

  const refreshCookies = useCallback(() => {
    setStatus('connecting');
    retryCount.current = 0;
    setBypasserKey((k) => k + 1);
  }, []);

  return (
    <CookieCtx.Provider value={{ cookies, userAgent, status, refreshCookies }}>
      {status !== 'ready' && (
        <CloudflareBypasser
          key={bypasserKey}
          url={sourceUrl}
          onCookiesReady={handleCookiesReady}
          onError={handleError}
        />
      )}
      {children}
    </CookieCtx.Provider>
  );
}
