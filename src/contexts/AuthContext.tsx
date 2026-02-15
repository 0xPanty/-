import React, { createContext, useContext, useState, useEffect } from 'react';
// @ts-ignore
import { sdk } from '@farcaster/miniapp-sdk';
import type { UserInfo } from '@/types';

interface AuthState {
  user: UserInfo | null;
  sdkReady: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  sdkReady: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context;
        if (context?.user) {
          const u = context.user as any;
          setUser({
            fid: u.fid,
            username: u.username || '',
            displayName: u.displayName || '',
            pfpUrl: u.pfpUrl || '',
            custodyAddress: u.custodyAddress || '',
            verifiedAddresses: u.verifiedAddresses?.ethAddresses || [],
          });
        }
        await sdk.actions.ready();
      } catch {
        await sdk.actions.ready().catch(() => {});
      } finally {
        setSdkReady(true);
      }
    };
    init();
  }, []);

  return (
    <AuthContext.Provider value={{ user, sdkReady }}>
      {children}
    </AuthContext.Provider>
  );
};
