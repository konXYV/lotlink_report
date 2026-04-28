"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { RefreshCw } from "lucide-react";

export default function RootPage() {
  const { user, loading, perm } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }

    // redirect ໄປໜ້າທໍາອິດທີ່ user ມີສິດ
    if (perm("page_dashboard")) { router.replace("/dashboard"); return; }
    if (perm("page_issues"))    { router.replace("/issues");    return; }
    if (perm("page_users"))     { router.replace("/admin/users"); return; }
    if (perm("user_manage"))    { router.replace("/admin/menus"); return; }

    // ບໍ່ມີສິດຫຍັງ → ຄ້າງຢູ່ /login
    router.replace("/login");
  }, [user, loading, perm, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <RefreshCw size={24} className="animate-spin text-blue-500" />
    </div>
  );
}
