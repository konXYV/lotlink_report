"use client";
// src/components/ActivityLog.tsx
import React, { useState, useEffect, useCallback } from "react";
import { History, X, RefreshCw, ChevronDown } from "lucide-react";
import {
  getActivityLogs,
  ACTION_LABELS,
  ACTION_COLORS,
  type ActivityLog,
} from "@/lib/activityService";
import { getAllUsers } from "@/lib/authService";
import { useAuth } from "@/lib/authContext";

function formatTime(ts: { seconds: number; nanoseconds: number } | null): string {
  if (!ts) return "-";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString("lo-LA", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

interface UserOption {
  uid:         string;
  displayName: string;
  email:       string;
}

export default function ActivityLogButton() {
  const { user } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [logs,      setLogs]      = useState<ActivityLog[]>([]);
  const [users,     setUsers]     = useState<UserOption[]>([]);
  const [filterUid, setFilterUid] = useState<string>("");
  const [loading,   setLoading]   = useState(false);

  const fetchLogs = useCallback(async (uid?: string) => {
    setLoading(true);
    try {
      const data = await getActivityLogs(uid || undefined);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load users list + logs when popup opens
  useEffect(() => {
    if (!open) return;
    fetchLogs(filterUid || undefined);
    getAllUsers().then((u) =>
      setUsers(u.map((x) => ({ uid: x.uid, displayName: x.displayName, email: x.email })))
    );
  }, [open]);

  const handleFilterChange = (uid: string) => {
    setFilterUid(uid);
    fetchLogs(uid || undefined);
  };

  if (!user?.isAdmin) return null;

  return (
    <>
      {/* ── Bell-replaced History button ─────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
        title="ປະຫວັດການໃຊ້ງານ"
      >
        <History size={16} />
        {logs.length === 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white" />
        )}
      </button>

      {/* ── Popup overlay ────────────────────────────────────── */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />

          <div
            className="fixed right-3 top-16 z-40 w-[360px] sm:w-[420px] max-h-[80vh]
                        bg-white rounded-2xl shadow-2xl border border-slate-200
                        flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <History size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">ປະຫວັດການໃຊ້ງານ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchLogs(user?.isAdmin ? (filterUid || undefined) : user?.uid)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
                  title="ໂຫຼດໃໝ່"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Filter — admin only */}
            {user?.isAdmin && (
              <div className="px-4 py-2.5 border-b border-slate-100 bg-white">
                <div className="relative">
                  <select
                    value={filterUid}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full appearance-none text-xs pl-3 pr-8 py-2
                               border border-slate-200 rounded-lg bg-slate-50
                               text-slate-700 focus:outline-none focus:ring-2
                               focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">👥 ທຸກ User</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Log list */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" />
                  <span className="text-sm">ກໍາລັງໂຫຼດ...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <History size={32} className="mb-2 opacity-30" />
                  <span className="text-sm">ຍັງບໍ່ມີປະຫວັດ</span>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <li key={log.id} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        {log.displayName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700 truncate">
                            {log.displayName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </div>
                        {log.detail && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{log.detail}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatTime(log.createdAt as { seconds: number; nanoseconds: number } | null)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
              <span className="text-[10px] text-slate-400">
                ສະແດງ {logs.length} ລາຍການຫຼ້າສຸດ
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
}