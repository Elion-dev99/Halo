import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  getUserProfile,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  subscribeAuth,
} from "@/services/authService";
import {
  bootstrapOrganization,
  getOrganization,
} from "@/services/orgService";
import type { Organization, UserProfile } from "@/types/models";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  needsOrganizationSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    displayName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setupOrganization: (params: {
    organizationName: string;
    displayName?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async (nextUser: User) => {
    const nextProfile = await getUserProfile(nextUser.uid);
    setProfile(nextProfile);
    if (nextProfile?.defaultOrgId) {
      try {
        const org = await getOrganization(nextProfile.defaultOrgId);
        setOrganization(org);
      } catch (error) {
        console.error(error);
        setOrganization(null);
      }
    } else {
      setOrganization(null);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
        return;
      }

      try {
        await loadSession(nextUser);
      } catch (error) {
        console.error(error);
        setProfile(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, [loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      organization,
      loading,
      needsOrganizationSetup: Boolean(user && !organization),
      async login(email, password) {
        await loginRequest(email, password);
      },
      async register(params) {
        await registerRequest(params);
      },
      async logout() {
        await logoutRequest();
      },
      async refreshSession() {
        if (!user) return;
        await loadSession(user);
      },
      async setupOrganization({ organizationName, displayName }) {
        if (!user) throw new Error("ログインが必要です。");
        const name =
          displayName?.trim() ||
          profile?.displayName ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "ユーザー";
        await bootstrapOrganization({
          uid: user.uid,
          email: user.email ?? profile?.email ?? "",
          displayName: name,
          organizationName,
        });
        await loadSession(user);
      },
    }),
    [user, profile, organization, loading, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
