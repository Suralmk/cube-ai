"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, signIn, signOut } from "@/lib/api/auth";
import { fetchOrganization } from "@/lib/api/organizations";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  organizationId?: string;
  hasOrganization: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  isLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login"];
const ONBOARDING_PATH = "/onboarding/organization";

async function hydrateUserFromSession(): Promise<User | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const org = await fetchOrganization();

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatarUrl: session.user.image ?? undefined,
    organizationId: org?.organization.id,
    hasOrganization: Boolean(org?.organization.id),
  };
}

function resolvePostAuthPath(user: User): string {
  return user.hasOrganization ? "/chat" : ONBOARDING_PATH;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    const nextUser = await hydrateUserFromSession();
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let cancelled = false;

    hydrateUserFromSession()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push("/login");
      }
      return;
    }

    if (!user.hasOrganization) {
      if (pathname !== ONBOARDING_PATH) {
        router.push(ONBOARDING_PATH);
      }
      return;
    }

    if (PUBLIC_PATHS.includes(pathname) || pathname === ONBOARDING_PATH) {
      router.push("/chat");
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      try {
        await signIn(email, password);
        const nextUser = await hydrateUserFromSession();
        if (!nextUser) {
          throw new Error("Signed in but session was not established");
        }
        setUser(nextUser);
        router.push(resolvePostAuthPath(nextUser));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to sign in";
        setAuthError(message);
        throw error;
      }
    },
    [router],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setAuthError(null);
      try {
        const { signUp } = await import("@/lib/api/auth");
        await signUp(name, email, password);
        const nextUser = await hydrateUserFromSession();
        if (!nextUser) {
          throw new Error("Account created but session was not established");
        }
        setUser(nextUser);
        router.push(resolvePostAuthPath(nextUser));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create account";
        setAuthError(message);
        throw error;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        refreshUser,
        isLoading,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
