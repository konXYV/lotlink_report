"use client";

import React, { useMemo } from "react";
import {
  RefreshCw,
  Download,
  Users,
  Briefcase,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useCasesQuery } from "@/app/CASES-LOTTO/hooks/Hooks_Cases";
import type { CaseItem } from "@/app/CASES-LOTTO/types/Type_Cases";
import { downloadCasesXlsx } from "./downloadCasesXlsx";
import { useDailyServiceQuery } from "../daily_services/hook/hook.daily";
import type { DailyServiceItem } from "../daily_services/types/types.daily.service";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// This view is a summary, not a paged list, so we pull a large batch in one
// go rather than paginating. If either dataset regularly exceeds this, move
// the counts below to a backend aggregation endpoint instead of computing
// them client-side from a capped page.
const SUMMARY_FETCH_LIMIT = 2000;

const RESOLVED_CASE_STATUSES = new Set(["ແກ້ໄຂແລ້ວ", "ປິດເຄສສຳເລັດແລ້ວ"]);
const RESOLVED_DAILY_STATUS = "100%";

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

const isResolvedCase = (status: string) => RESOLVED_CASE_STATUSES.has(status);
const isResolvedDaily = (status: string) => status === RESOLVED_DAILY_STATUS;

const isToday = (dateString?: string | null): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

type AgentSummary = {
  name: string;
  total: number;
  resolved: number;
  ongoing: number;
};

function summarizeByAgent<T>(
  items: T[],
  getName: (item: T) => string | null | undefined,
  getIsResolved: (item: T) => boolean,
): AgentSummary[] {
  const map = new Map<string, { total: number; resolved: number }>();

  for (const item of items) {
    const name = getName(item)?.trim() || "ຍັງບໍ່ໄດ້ມອບໝາຍ";
    const entry = map.get(name) ?? { total: 0, resolved: 0 };
    entry.total += 1;
    if (getIsResolved(item)) entry.resolved += 1;
    map.set(name, entry);
  }

  return [...map.entries()]
    .map(([name, { total, resolved }]) => ({
      name,
      total,
      resolved,
      ongoing: total - resolved,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "emerald";
}) {
  const valueClass =
    tone === "amber"
      ? "text-amber-600"
      : tone === "emerald"
        ? "text-emerald-600"
        : "text-slate-800";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1.5 text-3xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function AgentRow({
  name,
  total,
  ongoing,
  resolved,
  maxTotal,
}: {
  name: string;
  total: number;
  ongoing: number;
  resolved: number;
  maxTotal: number;
}) {
  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;
  const ongoingPct = total > 0 ? (ongoing / total) * 100 : 0;
  const barWidthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div
        className="w-40 shrink-0 truncate text-sm font-medium text-slate-700"
        title={name}
      >
        {name}
      </div>

      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full" style={{ width: `${barWidthPct}%` }}>
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${resolvedPct}%` }}
            />
            <div
              className="h-full bg-amber-300"
              style={{ width: `${ongoingPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex w-56 shrink-0 items-center justify-end gap-4 text-sm tabular-nums">
        <span className="text-slate-400">
          ດຳເນີນ <span className="font-medium text-amber-600">{ongoing}</span>
        </span>
        <span className="text-slate-400">
          ສຳເລັດ{" "}
          <span className="font-medium text-emerald-600">{resolved}</span>
        </span>
        <span className="w-10 text-right font-semibold text-slate-800">
          {total}
        </span>
      </div>
    </div>
  );
}

function AgentBreakdownCard({
  title,
  icon,
  agents,
}: {
  title: string;
  icon: React.ReactNode;
  agents: AgentSummary[];
}) {
  const maxTotal = agents.length > 0 ? agents[0].total : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        {icon}
        <p className="text-sm font-medium text-slate-700">{title}</p>
      </div>

      {agents.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-400">
          ຍັງບໍ່ມີຂໍ້ມູນ
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {agents.map((agent) => (
            <AgentRow
              key={agent.name}
              name={agent.name}
              total={agent.total}
              ongoing={agent.ongoing}
              resolved={agent.resolved}
              maxTotal={maxTotal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatSection({
  title,
  icon,
  total,
  ongoing,
  resolved,
  today,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  ongoing: number;
  resolved: number;
  today: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="ທັງໝົດ" value={total} />
        <StatCard label="ຍັງດຳເນີນຢູ່" value={ongoing} tone="amber" />
        <StatCard label="ສຳເລັດແລ້ວ" value={resolved} tone="emerald" />
        <StatCard label="ມື້ນີ້" value={today} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CasesDashboardSummary() {
  const auth = useAuth();
  const user = auth?.user?.displayName;

  // ── Queries ────────────────────────────────────────────────────────────────

  const casesQuery = useCasesQuery({
    page: 1,
    limit: SUMMARY_FETCH_LIMIT,
    search: "",
    status: "ALL",
  });

  const dailyQuery = useDailyServiceQuery({
    page: 1,
    limit: SUMMARY_FETCH_LIMIT,
    search: "",
    status: undefined,
  });

  const allCases: CaseItem[] = Array.isArray(casesQuery.data?.data)
    ? casesQuery.data!.data
    : [];
  const allDaily: DailyServiceItem[] = Array.isArray(dailyQuery.data?.data)
    ? dailyQuery.data!.data
    : [];

  const isLoading = casesQuery.isLoading || dailyQuery.isLoading;
  const isError = casesQuery.isError || dailyQuery.isError;
  const isFetching = casesQuery.isFetching || dailyQuery.isFetching;

  const refetchAll = () => {
    casesQuery.refetch();
    dailyQuery.refetch();
  };

  // ── Overall summaries ──────────────────────────────────────────────────────

  const caseOverall = useMemo(() => {
    let resolved = 0;
    let today = 0;
    for (const item of allCases) {
      if (isResolvedCase(item.status)) resolved += 1;
      if (isToday(item.created_at)) today += 1;
    }
    return {
      total: allCases.length,
      resolved,
      ongoing: allCases.length - resolved,
      today,
    };
  }, [allCases]);

  const dailyOverall = useMemo(() => {
    let resolved = 0;
    let today = 0;
    for (const item of allDaily) {
      if (isResolvedDaily(item.status)) resolved += 1;
      if (isToday(item.created_at)) today += 1;
    }
    return {
      total: allDaily.length,
      resolved,
      ongoing: allDaily.length - resolved,
      today,
    };
  }, [allDaily]);

  const combinedTotal = caseOverall.total + dailyOverall.total;

  // ── Per-agent breakdowns ───────────────────────────────────────────────────

  const casesByAgent = useMemo(
    () =>
      summarizeByAgent(
        allCases,
        (i) => i.assigned_to,
        (i) => isResolvedCase(i.status),
      ),
    [allCases],
  );

  // Daily Service tracks the responsible person under `agreement`.
  const dailyByAgent = useMemo(
    () =>
      summarizeByAgent(
        allDaily,
        (i) => i.agreement,
        (i) => isResolvedDaily(i.status),
      ),
    [allDaily],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Dashboard ພາບລວມ
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              ລວມຍອດ Cases ແລະ Daily Service
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-1 text-sm text-slate-400">
              ສະບາຍດີ,{" "}
              <span className="font-medium text-slate-600">
                {user || "Guest"}
              </span>
            </div>
            <button
              onClick={() => downloadCasesXlsx(allCases)}
              disabled={allCases.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={refetchAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-400">
            ກຳລັງໂຫຼດຂໍ້ມູນ...
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
            <p className="text-sm text-red-500">ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ</p>
            <button
              onClick={refetchAll}
              className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              ລອງໃໝ່
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Combined headline number */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                <LayoutGrid size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  ຍອດລວມທັງລະບົບ (Cases + Daily Service)
                </p>
                <p className="text-2xl font-semibold text-slate-800">
                  {combinedTotal}
                </p>
              </div>
            </div>

            {/* ── Box 1: useCasesQuery ─────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 bg-slate-100/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                  <Briefcase size={14} className="text-white" />
                </span>
                <h2 className="text-base font-semibold text-slate-800">
                  Cases
                </h2>
                <span className="text-xs text-slate-400">(useCasesQuery)</span>
              </div>

              <div className="space-y-5">
                <StatSection
                  title="ພາບລວມ"
                  icon={<Briefcase size={15} className="text-slate-400" />}
                  total={caseOverall.total}
                  ongoing={caseOverall.ongoing}
                  resolved={caseOverall.resolved}
                  today={caseOverall.today}
                />
                <AgentBreakdownCard
                  title="ຈຳນວນເຄສແຕ່ລະຄົນ"
                  icon={<Users size={15} className="text-slate-400" />}
                  agents={casesByAgent}
                />
              </div>
            </section>

            {/* ── Box 2: useDailyServiceQuery ──────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 bg-slate-100/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
                  <Briefcase size={14} className="text-white" />
                </span>
                <h2 className="text-base font-semibold text-slate-800">
                  Daily Service
                </h2>
                <span className="text-xs text-slate-400">
                  (useDailyServiceQuery)
                </span>
              </div>

              <div className="space-y-5">
                <StatSection
                  title="ພາບລວມ"
                  icon={<Briefcase size={15} className="text-slate-400" />}
                  total={dailyOverall.total}
                  ongoing={dailyOverall.ongoing}
                  resolved={dailyOverall.resolved}
                  today={dailyOverall.today}
                />
                <AgentBreakdownCard
                  title="ຈຳນວນງານແຕ່ລະຄົນ"
                  icon={<Users size={15} className="text-slate-400" />}
                  agents={dailyByAgent}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
