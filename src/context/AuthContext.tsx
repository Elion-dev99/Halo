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
import { updateProfile } from "firebase/auth";
import {
  getUserProfile,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  subscribeAuth,
} from "@/services/authService";
import {
  acceptPendingInvitesForUser,
  ensureMemberDefaults,
  updateMemberProfile,
} from "@/services/memberService";
import {
  bootstrapOrganization,
  getMembership,
  getOrganization,
  linkUserToOrg,
  updateUserProfile as updateUserProfileDoc,
} from "@/services/orgService";
import {
  isSysUnlocked,
  resolvePlatformAdmin,
  setSysUnlocked,
} from "@/services/platformAdminService";
import { can as roleCan, canAny as roleCanAny, type Permission } from "@/domain/permissions";
import type { MemberRole, Organization, OrgMember, UserProfile } from "@/types/models";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  membership: OrgMember | null;
  role: MemberRole | null;
  loading: boolean;
  needsOrganizationSetup: boolean;
  /** システム開発・運用者（一般ナビには出さない） */
  isPlatformAdmin: boolean;
  /** セッション内で隠し入口を解錠したか */
  sysConsoleVisible: boolean;
  unlockSysConsole: () => boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
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
  updateDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrgMember | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [sysConsoleVisible, setSysConsoleVisible] = useState(() => isSysUnlocked());
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async (nextUser: User) => {
    const displayName =
      nextUser.displayName || nextUser.email?.split("@")[0] || "ユーザー";

    const claimedOrgId = await acceptPendingInvitesForUser({
      uid: nextUser.uid,
      email: nextUser.email ?? "",
      displayName,
    }).catch((error) => {
      console.error(error);
      return null;
    });

    let nextProfile = await getUserProfile(nextUser.uid);
    if (
      claimedOrgId &&
      (!nextProfile?.defaultOrgId || nextProfile.defaultOrgId !== claimedOrgId)
    ) {
      await linkUserToOrg({
        uid: nextUser.uid,
        email: nextUser.email ?? nextProfile?.email ?? "",
        displayName: nextProfile?.displayName || displayName,
        orgId: claimedOrgId,
      });
      nextProfile = await getUserProfile(nextUser.uid);
    }

    setProfile(nextProfile);

    const platform = await resolvePlatformAdmin({
      uid: nextUser.uid,
      email: nextUser.email ?? nextProfile?.email,
    });
    setIsPlatformAdmin(platform);

    if (nextProfile?.defaultOrgId) {
      try {
        const org = await getOrganization(nextProfile.defaultOrgId);
        setOrganization(org);
        const patched = await ensureMemberDefaults({
          orgId: nextProfile.defaultOrgId,
          uid: nextUser.uid,
          email: nextUser.email ?? nextProfile.email,
          displayName: nextProfile.displayName || displayName,
        }).catch(() => null);
        const member =
          patched ??
          (await getMembership(nextProfile.defaultOrgId, nextUser.uid));
        setMembership(member);
      } catch (error) {
        console.error(error);
        setOrganization(null);
        setMembership(null);
      }
    } else {
      setOrganization(null);
      setMembership(null);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setIsPlatformAdmin(false);
        setSysUnlocked(false);
        setSysConsoleVisible(false);
        setLoading(false);
        return;
      }

      try {
        await loadSession(nextUser);
      } catch (error) {
        console.error(error);
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setIsPlatformAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, [loadSession]);

  const role =
    membership?.status === "disabled" ? null : (membership?.role ?? null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      organization,
      membership,
      role,
      loading,
      needsOrganizationSetup: Boolean(user && !organization),
      isPlatformAdmin,
      sysConsoleVisible: isPlatformAdmin && sysConsoleVisible,
      unlockSysConsole() {
        if (!isPlatformAdmin) return false;
        setSysUnlocked(true);
        setSysConsoleVisible(true);
        return true;
      },
      can(permission) {
        return roleCan(role, permission);
      },
      canAny(permissions) {
        return roleCanAny(role, permissions);
      },
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
      async updateDisplayName(displayName) {
        if (!user) throw new Error("ログインが必要です。");
        const trimmed = displayName.trim();
        await updateProfile(user, { displayName: trimmed });
        await updateUserProfileDoc({ uid: user.uid, displayName: trimmed });
        if (organization) {
          await updateMemberProfile({
            orgId: organization.id,
            uid: user.uid,
            displayName: trimmed,
            email: user.email ?? profile?.email,
          });
        }
        await loadSession(user);
      },
    }),
    [
      user,
      profile,
      organization,
      membership,
      role,
      loading,
      loadSession,
      isPlatformAdmin,
      sysConsoleVisible,
    ],
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
