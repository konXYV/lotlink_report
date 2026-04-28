"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, Users, X, ChevronRight, ChevronDown,
  FileText, BarChart3, Settings, Bell, Star, Bookmark, Globe,
  Database, ShieldCheck, Folder, Tag, Package, Layers, LayoutList,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { buildSectionTree, type MenuNode, type IconName } from "@/lib/menuService";

// ── icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ClipboardList, Users, FileText, BarChart3,
  Settings, Bell, Star, Bookmark, Globe, Database,
  ShieldCheck, Folder, Tag, Package, Layers, ChevronDown,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity,
};

function NavIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Folder;
  return <Icon size={size} className={className} />;
}

// ── static nav ────────────────────────────────────────────────────────────────
const STATIC_NAV = [
  { href: "/dashboard",    label: "Dashboard",       icon: "LayoutDashboard", permKey: "page_dashboard" },
  { href: "/issues",       label: "ລາຍງານບັນຫາ",   icon: "ClipboardList",   permKey: "page_issues"    },
];

const ADMIN_NAV = [
  { href: "/admin/users", label: "ຈັດການ Users", icon: "Users",      permKey: "page_users"   },
  { href: "/admin/menus", label: "ຈັດການ Menus", icon: "LayoutList", permKey: "user_manage"  },
];

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { user, perm, menus } = useAuth();

  // track which groups are open; key = menu.id
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  // ── plain nav item (link) ──────────────────────────────────────────────────
  const NavItem = ({
    href, label, icon, indent = false,
  }: { href: string; label: string; icon: string; indent?: boolean }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href} onClick={onClose}
        className={`group flex items-center gap-2.5 rounded-xl text-sm transition-all
          ${indent ? "pl-9 pr-3 py-2" : "px-3 py-2.5"}
          ${active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
        <NavIcon name={icon} size={15}
          className={active ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
        <span className="flex-1 font-medium truncate">{label}</span>
        {active && <ChevronRight size={13} className="opacity-70 shrink-0" />}
      </Link>
    );
  };

  // ── dropdown group ─────────────────────────────────────────────────────────
  const GroupItem = ({ node }: { node: MenuNode }) => {
    const m = node.menu;
    const isOpen = openGroups[m.id!] ?? false;
    // group is "active" if any child is active
    const hasActive = node.children.some(c =>
      pathname === c.menu.href || pathname.startsWith(c.menu.href + "/"));

    return (
      <div>
        <button onClick={() => toggleGroup(m.id!)}
          className={`w-full group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all
            ${hasActive && !isOpen
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
          <NavIcon name={m.icon} size={15}
            className={hasActive && !isOpen ? "text-blue-500" : "text-slate-400 group-hover:text-slate-600"} />
          <span className="flex-1 font-medium truncate text-left">{m.label}</span>
          <ChevronDown size={13}
            className={`shrink-0 transition-transform duration-200 text-slate-400
              ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* children */}
        {isOpen && (
          <div className="mt-0.5 space-y-0.5 pb-1">
            {node.children.map(child => (
              <NavItem key={child.menu.id}
                href={child.menu.href}
                label={child.menu.label}
                icon={child.menu.icon}
                indent />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── build dynamic sections ─────────────────────────────────────────────────
  const dynamicSections = buildSectionTree(menus, perm);

  const staticNav = STATIC_NAV.filter(n => perm(n.permKey));
  const adminNav  = ADMIN_NAV.filter(n => perm(n.permKey));

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full z-40 flex flex-col w-56
        bg-white border-r border-slate-200 shadow-lg
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto lg:h-screen lg:shrink-0
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/sokxay.png" alt="logo" className="w-8 h-8 object-contain"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  const p = el.parentElement;
                  if (p) p.innerHTML = `<span class="text-white text-xs font-bold">S+</span>`;
                }} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">Sokxay One Plus</p>
              <p className="text-[10px] text-slate-400 leading-tight">Issue Tracker</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">

          {/* Static: MAIN */}
          {staticNav.length > 0 && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 tracking-widest uppercase">MAIN</p>
              <div className="space-y-0.5">
                {staticNav.map(n => <NavItem key={n.href} href={n.href} label={n.label} icon={n.icon} />)}
              </div>
            </div>
          )}

          {/* Dynamic sections */}
          {dynamicSections.map(sec => (
            <div key={sec.sectionId}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
                {sec.sectionLabel}
              </p>
              <div className="space-y-0.5">
                {sec.nodes.map(node =>
                  node.menu.type === "group"
                    ? <GroupItem key={node.menu.id} node={node} />
                    : <NavItem key={node.menu.id}
                        href={node.menu.href}
                        label={node.menu.label}
                        icon={node.menu.icon} />
                )}
              </div>
            </div>
          ))}

          {/* Admin */}
          {adminNav.length > 0 && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 tracking-widest uppercase">ADMIN</p>
              <div className="space-y-0.5">
                {adminNav.map(n => <NavItem key={n.href} href={n.href} label={n.label} icon={n.icon} />)}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        {user && (
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${user.isAdmin ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 truncate">{user.displayName}</p>
                <p className={`text-[10px] ${user.isAdmin ? "text-violet-500" : "text-blue-500"}`}>
                  {user.isAdmin ? "Admin" : "Custom"}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
