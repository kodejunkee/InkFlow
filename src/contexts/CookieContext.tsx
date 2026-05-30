/**
 * CookieContext — Provides Cloudflare cookies to the entire Browse system.
 *
 * Wraps the Browse tab with a cookie provider that handles:
 * - Initial Cloudflare challenge solving via hidden WebView
 * - Cookie storage and refresh
 * - Connection status tracking
 * - Auto-timeout: proceeds without cookies after 8s so the UI isn't blocked
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { CookieStatus } from '../types/novel';
import CloudflareBypasser from '../components/novel/CloudflareBypasser';

/** How long to wait for Cloudflare cookies before giving up and proceeding. */
const COOKIE_TIMEOUT_MS = 8_000;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

interface CookieContextValue {
  cookies: string;
  userAgent: string;
  status: CookieStatus;
  refreshCookies: () => void;
}

const CookieCtx = createContext<CookieContextValue>({
  cookies: '',
  userAgent: DEFAULT_USER_AGENT,
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
  const [userAgent, setUserAgent] = useState(DEFAULT_USER_AGENT);
  const [status, setStatus] = useState<CookieStatus>('connecting');
  const [bypasserKey, setBypasserKey] = useState(0);
  const retryCount = useRef(0);
  const resolved = useRef(false);

  // Auto-timeout: if cookies aren't obtained within COOKIE_TIMEOUT_MS,
  // proceed with empty cookies (many sources work without them).
  useEffect(() => {
    if (status !== 'connecting') return;

    const timer = setTimeout(() => {
      if (!resolved.current) {
        console.log('[CookieProvider] Timeout — proceeding without cookies');
        resolved.current = true;
        setStatus('ready');
      }
    }, COOKIE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [status, bypasserKey]);

  const handleCookiesReady = useCallback((c: string, ua: string) => {
    if (resolved.current) return; // Already timed out
    resolved.current = true;
    setCookies(c);
    setUserAgent(ua || DEFAULT_USER_AGENT);
    setStatus('ready');
    retryCount.current = 0;
  }, []);

  const handleError = useCallback((error: string) => {
    console.warn('[CookieProvider] Error:', error);
    if (resolved.current) return; // Already timed out

    if (retryCount.current < 2) {
      retryCount.current += 1;
      setBypasserKey((k) => k + 1);
    } else {
      // Give up on cookies but don't block the user
      resolved.current = true;
      setStatus('ready');
    }
  }, []);

  const refreshCookies = useCallback(() => {
    resolved.current = false;
    setStatus('connecting');
    retryCount.current = 0;
    setBypasserKey((k) => k + 1);
  }, []);

  return (
    <CookieCtx.Provider value={{ cookies, userAgent, status, refreshCookies }}>
      {status === 'connecting' && (
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
