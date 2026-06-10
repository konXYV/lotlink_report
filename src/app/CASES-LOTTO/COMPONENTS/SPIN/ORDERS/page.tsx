"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  Dices,
  Trophy,
  History,
  CreditCard,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useGet_Order_SPIN } from "@/app/CASES-LOTTO/hooks/hook_spin";
import { formatDate } from "../../../../utils/FormatDate";
import { formatMoney } from "../../../../utils/FormartMoney";
import { Badge } from "../../../../../components/Badge";
import { Row } from "../../../../../components/Row";
import { Card } from "../../../../../components/Card";

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-10 w-32 rounded-xl bg-slate-200" />
        <div className="h-6 w-48 rounded-lg bg-slate-200" />
      </div>
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 space-y-4">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-50 border border-slate-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getSpinResultBadgeClass = (value?: string | null): string => {
  switch ((value || "").toUpperCase()) {
    case "WIN":
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    case "LOSE":
    case "FAIL":
    case "FAILED":
      return "bg-rose-50 text-rose-700 border-rose-200/60";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200/60";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200/60";
  }
};

// ── Main Page Content ─────────────────────────────────────────────────────────

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const caseNumber = searchParams.get("case_number") ?? "";
  const errorType = searchParams.get("error_type") ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Order_SPIN(caseNumber);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-7xl space-y-6">
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-medium text-blue-700 backdrop-blur-sm animate-fade-in">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            ກຳລັງໂຫຼດຂໍ້ມູນລາຍການ Spin... (ອາດໃຊ້ເວລາປະມານ 1-4 ນາທີ)
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl text-center space-y-6">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-10 shadow-xl shadow-slate-100 ring-1 ring-red-50">
            <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4 animate-bounce">
              <AlertCircle size={44} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              ບໍ່ສາມາດດຶງຂໍ້ມູນ Spin ໄດ້
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              ກະລຸນາກວດສອບຄວາມຖືກຕ້ອງຂອງ{" "}
              <span className="font-semibold text-slate-700">Case Number</span>{" "}
              ຫຼື ລອງໃໝ່ອີກຄັ້ງໃນພາຍຫຼັງ.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              >
                <ArrowLeft size={16} />
                ກັບຄືນໜ້າກ່ອນໜ້າ
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={isFetching ? "animate-spin" : ""}
                />
                {isFetching ? "ກຳລັງໂຫຼດຄືນ..." : "ລອງໃໝ່ອີກຄັ້ງ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI (60-30-10 Rule Applied) ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased p-4 md:p-8 selection:bg-blue-100">
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        {/* Top Navigation Action */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:text-slate-900 hover:border-slate-300 active:scale-95"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            ກັບຄືນ
          </button>
        </div>

        {/* Card 1: Header Section */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-100/50 backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Dices size={24} />
                </span>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  ແຜງຄວບຄຸມລາຍການ Spin (Order Spin Dashboard)
                </h1>
              </div>
              <p className="text-sm text-slate-500 pl-12">
                ຂໍ້ມູນການກວດສອບຜົນ spin ແລະ ການຈັດການຈ່າຍລາງວັນໃນລະບົບ
              </p>
            </div>

            {/* Badge Status - Highlighted Meta */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 self-start lg:self-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ສະຖານະເຄສ:
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                {typeStatus || "ບໍ່ມີສະຖານະ"}
              </span>
            </div>
          </div>

          {/* Meta Information Grids */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ໝາຍເລກເຄສ (Case Number)
              </span>
              <p className="text-sm font-bold text-blue-600 tracking-wide">
                {caseNumber || "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ປະເພດຂໍ້ຜິດພາດ (Error Type)
              </span>
              <p className="text-sm font-bold text-slate-800">
                {errorType || "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ເວລາເຮັດທຸລະກຳ (Tx Time)
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {formatDate(data.TXTIME)}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Core Metrics Highlight (30% Content structure) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900">
              <History size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              ຜົນການ Spin ທີ່ໄດ້ຮັບ
            </span>
            <span
              className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getSpinResultBadgeClass(data.SPINRESULT)}`}
            >
              {data.SPINRESULT || "-"}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
              <Trophy size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block">
              ຈຳນວນເງິນລາງວັນ (Win Amount)
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-emerald-700 block">
              {formatMoney(data.WINAMOUNT)}{" "}
              <span className="text-sm font-normal text-emerald-600/70">
                LAK
              </span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/20 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600">
              <Layers size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">
              ຜົນລັບລະບົບຫຼັກ (Core Result)
            </span>
            <span className="mt-2 text-xl font-bold tracking-tight text-blue-700 block truncate">
              {data.CORERESULT || "-"}
            </span>
          </div>
        </div>

        {/* Card 3: Information Detailed Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Win Information Section */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all hover:border-slate-300/80">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-800">
                ລາຍລະອຽດການຖືກລາງວັນ (Prize Details)
              </h2>
            </div>
            <div className="space-y-1">
              <Row label="ຜົນການ Spin" value={data.SPINRESULT || "-"} />
              <Row
                label="ຈຳນວນເງິນລາງວັນ"
                value={`${formatMoney(data.WINAMOUNT)} LAK`}
              />
              <Row
                label="ໝາຍເລກອ້າງອີງລາງວັນ (Win XREF)"
                value={data.WINXREF || "-"}
              />
              <Row label="ຜົນລັບລະບົບຫຼັກ" value={data.CORERESULT || "-"} />
            </div>
          </div>

          {/* Account & Channel Section */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all hover:border-slate-300/80">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-slate-400" />
              <h2 className="text-base font-bold text-slate-800">
                ບັນຊີ ແລະ ຊ່ອງທາງການຊຳລະ (Channel Metrics)
              </h2>
            </div>
            <div className="space-y-1">
              <Row label="ບັນຊີຮັບເງິນລາງວັນ" value={data.WINACCOUNT || "-"} />
              <Row
                label="ເລກທີບັດບັນທຶກ (Win Journal)"
                value={data.WINJOURNAL || "-"}
              />
              <Row label="ຊ່ອງທາງຮັບລາງວັນ" value={data.WINCHANNEL || "-"} />
              <Row label="ເວລາເຮັດທຸລະກຳ" value={formatDate(data.TXTIME)} />
            </div>
          </div>
        </div>

        {/* Card 4: Spin Scenario Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={18} className="text-slate-400" />
            <h2 className="text-base font-bold text-slate-800">
              ຮູບແບບການ Spin (Spin Scenario Breakdown)
            </h2>
          </div>
          <div className="rounded-2xl bg-slate-50/50 p-5 border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card title="ລະຫັດງວດ (Draw ID)" value={data.DRAWID || "-"} />
              <Card
                title="ຈຳນວນເງິນລາງວັນ"
                value={formatMoney(data.WINAMOUNT)}
              />
              <Card title="ຊ່ອງທາງຮັບລາງວັນ" value={data.WINCHANNEL || "-"} />
              <Card title="ຜົນລັບລະບົບຫຼັກ" value={data.CORERESULT || "-"} />
            </div>
          </div>
        </div>

        {/* Card 5: Contextual Action Button - High Contrast 10% Call to Action */}
        <div className="rounded-2xl border border-slate-200/60 bg-slate-900 p-4 shadow-xl shadow-slate-900/10">
          <Link
            href={{
              pathname: "/CASES-LOTTO/COMPONENTS/SPIN/STMT",
              query: {
                billNumber: data.WINXREF ?? "",
                type_status: typeStatus,
                error_type: errorType,
                case_number: caseNumber,
              },
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 hover:scale-[1.005] active:scale-[0.995]"
          >
            <span>ດຳເນີນການຈ່າຍລາງວັນ Spin</span>
            <ExternalLink size={16} className="ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ORDER_SPIN() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-sm font-medium text-slate-400">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span>ກຳລັງໂຫຼດໂຄງສ້າງໜ້າຈໍ...</span>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}
