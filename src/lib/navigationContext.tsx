"use client";
import {
  createContext, useContext, useState, useCallback,
  useRef, useEffect, type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type NavigationContextType = {
  isNavigating: boolean;
  targetPath: string | null;
  navigateTo: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  targetPath: null,
  navigateTo: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  const navigateTo = useCallback((href: string) => {
    // ถ้าเป็นหน้าเดิม ไม่ต้อง navigate
    if (href === pathname) return;
    setIsNavigating(true);
    setTargetPath(href);
    router.push(href);
  }, [pathname, router]);

  useEffect(() => {
    // pathname เปลี่ยน = เข้าหน้าใหม่แล้ว → ซ่อน skeleton
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      // delay เล็กน้อย ให้ content render ก่อนถึงจะซ่อน skeleton
      const t = setTimeout(() => {
        setIsNavigating(false);
        setTargetPath(null);
      }, 80);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <NavigationContext.Provider value={{ isNavigating, targetPath, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);
