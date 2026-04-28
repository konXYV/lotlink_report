"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, type AppUser, ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS } from "@/lib/authService";
import { subscribeToMenus, type AppMenu } from "@/lib/menuService";

interface AuthCtx {
  user:    AppUser | null;
  loading: boolean;
  menus:   AppMenu[];
  perm:    (key: string) => boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true, menus: [], perm: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menus,   setMenus]   = useState<AppMenu[]>([]);
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const menusUnsubRef   = useRef<(() => void) | null>(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      // cleanup ก่อนเสมอ
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;
      menusUnsubRef.current?.();
      menusUnsubRef.current = null;

      if (fbUser) {
        // Initial profile fetch
        const profile = await getUserProfile(fbUser.uid);
        if (!profile || !profile.active) {
          setUser(null);
          setMenus([]);
          setLoading(false);
          await signOut(auth);
          return;
        }
        setUser(profile);
        setLoading(false);

        // Realtime: user profile (permissions, active status)
        const userDocRef = doc(db, "users", fbUser.uid);
        profileUnsubRef.current = onSnapshot(userDocRef, async (snap) => {
          if (!snap.exists()) {
            setUser(null);
            setMenus([]);
            await signOut(auth);
            return;
          }
          const data = snap.data();
          if (!data.active) {
            setUser(null);
            setMenus([]);
            await signOut(auth);
            return;
          }
          const isAdmin = data.isAdmin === true || data.role === "admin";
          setUser({
            uid:         fbUser.uid,
            email:       data.email       ?? "",
            displayName: data.displayName ?? "",
            isAdmin,
            active:      data.active ?? true,
            permissions: isAdmin
              ? { ...ADMIN_PERMISSIONS }
              : { ...DEFAULT_PERMISSIONS, ...(data.permissions ?? {}) },
            createdAt:   data.createdAt,
          });
        });

        // Realtime: menus — subscribe เฉพาะตอน login แล้วเท่านั้น
        menusUnsubRef.current = subscribeToMenus((m) => setMenus(m));

      } else {
        setUser(null);
        setMenus([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      profileUnsubRef.current?.();
      menusUnsubRef.current?.();
    };
  }, []);

  const perm = (key: string): boolean => {
    if (!user) return false;
    if (user.isAdmin) return true;
    return user.permissions[key] === true;
  };

  return (
    <AuthContext.Provider value={{ user, loading, menus, perm }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
