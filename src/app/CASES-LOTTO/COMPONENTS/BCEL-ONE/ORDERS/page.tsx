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
} from "lucide-react";
import { useGet_Order_BCEL } from "@/app/CASES-LOTTO/hooks/Hook_BCEL";
import { formatDate } from "../../../../utils/FormatDate";
import { formatMoney } from "../../../../utils/FormartMoney";
import { Badge } from "../../../../../components/Badge";
import { Row } from "../../../../../components/Row";
import { Card } from "../../../../../components/Card";
// ── Constants ─────────────────────────────────────────────────────────────────

const MENU_MAP: Record<string, { label: string; to: string }> = {
  NOT_REWARD: {
    label: "ປະເພດລາງວັນ",
    to: "/CASES-LOTTO/COMPONENTS/BCEL-ONE/REWARD",
  },
  NOT_BILL: {
    label: "ສົ່ງເງິນຄືນ",
    to: "/CASES-LOTTO/COMPONENTS/BCEL-ONE/STMT",
  },
  NOT_POINT: {
    label: "ກວດສອບຄະແນນ",
    to: "/CASES-LOTTO/COMPONENTS/POINT_LEGER",
  },
  NOT_REWARD_SPIN: {
    label: "ຈ່າຍລາງວັນ-Spin",
    to: "/CASES-LOTTO/COMPONENTS/SPIN",
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

const getStatusClass = (status?: string | null): string => {
  switch (status) {
    case "ຫາກະແຈ້ງມາ":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "ກຳລັງດຳເນີນ":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "ແກ້ໄຂແລ້ວ":
      return "text-green-600 bg-green-50 border-green-200";
    case "ປິດເຄສສຳເລັດແລ້ວ":
      return "text-white bg-primary-700 border-slate-200";
    case "ລໍຂໍ້ມູນຈາກລູກຄ້າ":
      return "text-purple-600 bg-purple-50 border-purple-200";
    default:
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
  }
};

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-32 rounded-xl bg-slate-200" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200" />
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
    useGet_Order_BCEL(caseNumber);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            ກຳລັງໂຫຼດຂໍ້ມູນ... (ອາດໃຊ້ເວລາຫຼາຍກວ່າ 4 ນາທີ)
          </div>

          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeft size={15} />
            ກັບຄືນ
          </button>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-12 shadow-sm">
            <AlertCircle size={40} className="text-red-400" />
            <p className="mt-4 text-base font-semibold text-slate-700">
              ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ
            </p>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              ກະລຸນາກວດສອບຄວາມຖືກຕ້ອງຂອງ{" "}
              <span className="font-semibold text-slate-700">Case Number</span>{" "}
              ຫຼື ລອງໃໝ່ອີກຄັ້ງໃນພາຍຫຼັງ.
            </p>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              ລອງໃໝ່
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ປຸ່ມກັບຄືນ */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200  bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-100"
        >
          <ArrowLeft size={15} />
          ກັບຄືນ
        </button>

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                BCEL Order Dashboard
              </h1>
              <p className="mt-1 text-sm ">
                ສະຖານະເຄສ:{" "}
                <span
                  className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusClass(status)}`}
                >
                  {status ?? "-"}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:min-w-[380px]">
              <div>
                <span className="text-xs text-slate-500">ລະຫັດເຄສ</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {caseNumber || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 ">ປະເພດບັນຫາ</span>
                <p className="mt-0.5 font-semibold text-orange-600">
                  {errorLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">ສະຖານະ Order</span>
              <Badge value={data.ORDER_STATUS} />
            </div>
          </div>

          {/* Key fields */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "LOTO_BILL_NO",
                value: data.LOTO_BILL_NO?.trim() || "-",
              },
              { label: "Ticket", value: data.TICKET?.trim() || "-" },
              { label: "Draw ID", value: data.DRAW_ID ?? "-" },
              { label: "ວັນທີ Draw", value: formatDate(data.DRAW_DATE) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="ຍອດຂາຍລວມ" value={formatMoney(data.TOTALSALE)} />
          <Card title="ຜູ້ໃຊ້" value={data.USERID?.trim() || "-"} />
          <Card title="ຄະແນນທີ່ໄດ້ຮັບ" value={formatMoney(data.POINT_ISSUED)} />
          <Card title="App" value={data.APP?.trim() || "-"} />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ຊ້າຍ — Order + Point */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                ຂໍ້ມູນ Order
              </h2>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Row label="ວັນທີ Order" value={formatDate(data.ORDER_DATE)} />
                <Row label="ວັນທີຂາຍ" value={formatDate(data.SALE_DATE)} />
                <Row
                  label="ວັນທີໝົດອາຍຸ"
                  value={formatDate(data.EXPIRE_DATE)}
                />
                <Row label="ສະຖານະລອດໂຕ" value={data.LOTTO_STATUS_ID} />
                <Row label="ໝາຍເຫດ" value={data.NOTE} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                ຂໍ້ມູນຄະແນນ
              </h2>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Row
                  label="ຄະແນນທີ່ໄດ້ຮັບ"
                  value={formatMoney(data.POINT_ISSUED)}
                />
                <Row
                  label="ເລກອ້າງອີງການໄດ້ຮັບ"
                  value={data.POINT_ISSUED_REFERENCE}
                />
                <Row
                  label="ຄະແນນທີ່ໃຊ້ໄປ"
                  value={formatMoney(data.POINT_CONSUMED)}
                />
                <Row
                  label="ເລກອ້າງອີງການໃຊ້"
                  value={data.POINT_CONSUMED_REFERENCE}
                />
              </div>
            </div>
          </div>

          {/* ຂວາ — ການຊຳລະ + Action */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                ຂໍ້ມູນການຊຳລະ
              </h2>
              <div className="space-y-1">
                <Row label="ເລກບັນຊີ" value={data.PAYMENT_ACC_NO} />
                <Row label="ສະກຸນເງິນ" value={data.PAYMENT_ACC_CCY} />
                <Row label="ເລກອ້າງອີງ" value={data.PJRRNO} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                ດຳເນີນການ
              </h2>

              {menu.to ? (
                <Link
                  href={{
                    pathname: menu.to,
                    query: {
                      billNumber: data.LOTO_BILL_NO ?? "",
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

              {/* Refetch button */}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={isFetching ? "animate-spin" : ""}
                />
                ໂຫຼດຂໍ້ມູນໃໝ່
              </button>
            </div>
          </div>
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
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            ກຳລັງໂຫຼດ...
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}
