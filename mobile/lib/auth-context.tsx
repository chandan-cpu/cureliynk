import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api";
import { fetchCurrentUser, logout as logoutRequest, type AuthUser } from "@/lib/auth";
import { clearTokens, getAccessToken } from "@/lib/auth-storage";
import { onSessionExpired } from "@/lib/session";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setStatus("unauthenticated");
          return;
        }

        try {
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
          setStatus("authenticated");
        } catch (error) {
          // An expired/invalid token is confirmed dead — clear it. Any other
          // failure (network down, 5xx) might just be transient, so the stored
          // token is left alone and retried on the next app launch.
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            await clearTokens();
          }
          setStatus("unauthenticated");
        }
      } catch {
        // This runs unconditionally at app boot, before any UI is usable —
        // if reading the stored token itself fails unexpectedly, fail safe
        // to unauthenticated rather than leaving status stuck on "loading"
        // and blocking the whole app forever.
        setStatus("unauthenticated");
      }
    })();
  }, []);

  // The API clients renew an expired access token behind the caller's back;
  // they only give up when the refresh token itself is rejected. That happens
  // deep inside a request with no screen in reach, so it is reported here —
  // flipping the status unmounts the protected stack and lands the user on
  // login, instead of leaving them on a signed-in screen where every action
  // fails with "your session has ended".
  useEffect(() => onSessionExpired(() => {
    setUser(null);
    setStatus("unauthenticated");
  }), []);

  const signIn = (nextUser: AuthUser) => {
    setUser(nextUser);
    setStatus("authenticated");
  };

  const signOut = async () => {
    try {
      await logoutRequest();
    } catch {
      // lib/auth.ts's logout() clears tokens in a `finally` even when the
      // network call fails, so local state can safely reset regardless.
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  return (
    <AuthContext.Provider value={{ status, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
