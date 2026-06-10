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
  Receipt,
  User,
  Wallet,
  Coins,
  FileText,
} from "lucide-react";
import { useGet_Order_LDB } from "@/app/CASES-LOTTO/hooks/Hook_Ldb";
import { formatDate } from "../../../../utils/FormatDate";
import { formatMoney } from "../../../../utils/FormartMoney";
import { Badge } from "../../../../../components/Badge";
import { Row } from "../../../../../components/Row";
import { Card } from "../../../../../components/Card";

// ── Constants ─────────────────────────────────────────────────────────────────

const MENU_MAP: Record<string, { label: string; to: string }> = {
  NOT_REWARD: {
    label: "ໄປໜ້າຈັດການ ປະເພດລາງວັນ",
    to: "/CASES-LOTTO/COMPONENTS/LDB/REWARD",
  },
  NOT_BILL: {
    label: "ໄປໜ້າຈັດການ ສົ່ງເງິນຄືນ",
    to: "/CASES-LOTTO/COMPONENTS/LDB/STMT",
  },
};

const ERROR_LABEL: Record<string, string> = {
  NOT_REWARD: "ບໍ່ໄດ້ຮັບເງິນລາງວັນ",
  NOT_BILL: "ບໍ່ໄດ້ຮັບບິນ ຫຼື ບີນບໍ່ສະແດງ",
  NOT_TOP_UP: "ບໍ່ໄດ້ຮັບມູນຄ່າໂທ",
  NOT_POINT: "ບໍ່ໄດ້ຮັບຄະແນນ",
  NOT_REWARD_SPIN: "ບໍ່ໄດ້ຮັບເງິນລາງວັນຈາກການ spin",
  P_NOTBILL: "ໃຊ້ຄະແນນຊື້ເລກບໍ່ໄດ້ບີນ",
  NOT_SELECT_ACC: "ບໍ່ສາມາດເລືອກບັນຊີຮັບລາງວັນ",
};

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-50 border border-slate-100"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

// ── Main Page Content ─────────────────────────────────────────────────────────

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const caseNumber = searchParams.get("case_number") ?? "";
  const errorType = searchParams.get("error_type") ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";

  const errorLabel = ERROR_LABEL[errorType] ?? errorType ?? "-";
  const menu = MENU_MAP[errorType] ?? { label: "", to: "" };
  const status = typeStatus || null;

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Order_LDB(caseNumber);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-7xl space-y-6">
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-medium text-blue-700 backdrop-blur-sm animate-fade-in">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            ກຳລັງໂຫຼດຂໍ້ມູນລະບົບ LDB... (ອາດໃຊ້ເວລາປະມານ 1-4 ນາທີ)
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
              ບໍ່ສາມາດດຶງຂໍ້ມູນຈາກລະບົບໄດ້
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              ກະລຸນາກວດສອບຄວາມຖືກຕ້ອງຂອງ{" "}
              <span className="font-semibold text-slate-700">Case Number</span>{" "}
              ຫຼື ລະບົບເຄືອຂ່າຍ ຈາກນັ້ນລອງໃໝ່ອີກຄັ້ງ.
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

  // ── Main UI (60-30-10 Rule applied) ─────────────────────────────────────────
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

        {/* Card 1: Header & Meta Core Information */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-100/50 backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Receipt size={22} />
                </span>
                <h1 className="text-xl flex gap-2 md:text-2xl font-bold tracking-tight text-slate-900">
                  ແດຊບອດລາຍການ
                  <p className="text-blue-700">
                    {data?.PAYBY || "Unknown"}
                  </p>{" "}
                  Order
                </h1>
              </div>
              <p className="text-sm text-slate-500 pl-11">
                ສະຖານະເຄສໃນລະບົບ:{" "}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                  {status || "ບໍ່ມີຂໍ້ມູນ"}
                </span>
              </p>
            </div>

            {/* Badge Status - Highlighted 10% */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 self-start lg:self-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ສະຖານະບິນ:
              </span>
              <Badge value={data.STATUS} />
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ປະເພດທະນາຄານ:
              </span>
              <p className="flex text-sm font-bold text-slate-800 tracking-wide">
                ທະນາຄານ:{" "}
                <p className=" text-primary-700 pl-3"> {data.PAYBY} </p>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ເລກເຄສ (Case Number)
              </span>
              <p className="text-sm font-bold text-slate-800 tracking-wide">
                {caseNumber || "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ປະເພດຂໍ້ຜິດພາດ (Error Type)
              </span>
              <p className="text-sm font-bold text-blue-700">{errorLabel}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 transition-colors hover:bg-slate-50">
              <div className="flex items-center gap-1.5 mb-1">
                <User size={13} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-400">
                  ລະຫັດຜູ້ໃຊ້ (User ID)
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {data.USERID || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Cards for Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="ເລກປີ້ (Ticket)" value={data.TICKET} />
          <Card title="ເລກບິນ (Bill Number)" value={data.BILLNUMBER} />
          <Card title="ງວດອອກເລກ (Draw ID)" value={data.DRAWID?.toString()} />
          <Card title="ເວລາເຮັດທຸລະກຳ" value={formatDate(data.TXTIME)} />
        </div>

        {/* Card 3: Financial Summary Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900">
              <Wallet size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              ຈຳນວນເງິນທັງໝົດ
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-slate-900 block">
              {formatMoney(data.AMOUNT)}{" "}
              <span className="text-sm font-normal text-slate-500">LAK</span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
              <Coins size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block">
              ຈຳນວນເງິນຫຼັງຫັກສ່ວນຫຼຸດ
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-emerald-700 block">
              {formatMoney(data.AMOUNTAFTERDISCOUNT)}{" "}
              <span className="text-sm font-normal text-emerald-600/70">
                LAK
              </span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/20 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600">
              <FileText size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">
              ຄະແນນທີ່ໄດ້ຮັບ (Points)
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-blue-700 block">
              {formatMoney(data.POINTISSUEAMOUNT)}{" "}
              <span className="text-sm font-normal text-blue-600/70">Pts</span>
            </span>
          </div>
        </div>

        {/* Card 4: Detailed Deep-dive split grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Sub-section */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all hover:border-slate-300/80">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-slate-400" />
              <h2 className="text-base font-bold text-slate-800">
                ຂໍ້ມູນບັນຊີທະນາຄານ (Account Details)
              </h2>
            </div>
            <div className="space-y-1">
              <Row label="ເລກບັນຊີ (Account)" value={data.ACCOUNT} />
              <Row label="ເລກອ້າງອີງລາຍວັນ (Journal)" value={data.JOURNAL} />
            </div>
          </div>

          {/* Points Sub-section */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all hover:border-slate-300/80">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold text-slate-800">
                ລາຍລະອຽດຄະແນນສະສົມ (Point Metrics)
              </h2>
            </div>
            <div className="space-y-1">
              <Row
                label="ມູນຄ່າຄະແນນທີ່ອອກ"
                value={`${formatMoney(data.POINTISSUEAMOUNT)} คะแนน`}
              />
              <Row
                label="ເລກອ້າງອີງຄະແນນ (Point Reference)"
                value={data.POINTISSUEREFERENCE}
              />
            </div>
          </div>
        </div>

        {/* Card 5: Action Button Drawer - High Contrast 10% Call to Action */}
        <div className="rounded-2xl border border-slate-200/60 bg-slate-900 p-4 shadow-xl shadow-slate-900/10">
          {menu.to ? (
            <Link
              href={{
                pathname: menu.to,
                query: {
                  billNumber: data.BILLNUMBER ?? "",
                  type_status: typeStatus,
                  error_type: errorType,
                  caseNumber: caseNumber,
                },
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {menu.label}
              <ExternalLink size={15} />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-400"
            >
              ເປີດເມນູທີ່ກ່ຽວຂ້ອງ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ORDER_BCELONE() {
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
