import {
  createContext,
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
import { getOrganization } from "@/services/orgService";
import type { Organization, UserProfile } from "@/types/models";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    displayName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

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
        const nextProfile = await getUserProfile(nextUser.uid);
        setProfile(nextProfile);
        if (nextProfile?.defaultOrgId) {
          const org = await getOrganization(nextProfile.defaultOrgId);
          setOrganization(org);
        } else {
          setOrganization(null);
        }
      } catch (error) {
        console.error(error);
        setProfile(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      organization,
      loading,
      async login(email, password) {
        await loginRequest(email, password);
      },
      async register(params) {
        await registerRequest(params);
      },
      async logout() {
        await logoutRequest();
      },
      async refreshOrganization() {
        if (!profile?.defaultOrgId) return;
        const org = await getOrganization(profile.defaultOrgId);
        setOrganization(org);
      },
    }),
    [user, profile, organization, loading],
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
