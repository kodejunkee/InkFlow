import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export interface CookieData {
  cookies: string;
  userAgent: string;
  timestamp: number;
}

interface CookieStore {
  domainCookies: Record<string, CookieData>;
  setCookies: (domain: string, cookies: string, userAgent: string) => void;
  getCookies: (domain: string) => CookieData | undefined;
}

export const useCookieStore = create<CookieStore>()(
  persist(
    (set, get) => ({
      domainCookies: {},
      setCookies: (domain: string, cookies: string, userAgent: string) => {
        set((state) => ({
          domainCookies: {
            ...state.domainCookies,
            [domain]: {
              cookies,
              userAgent: userAgent || DEFAULT_USER_AGENT,
              timestamp: Date.now(),
            },
          },
        }));
      },
      getCookies: (domain: string) => get().domainCookies[domain],
    }),
    {
      name: 'inkflow-cookies',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
