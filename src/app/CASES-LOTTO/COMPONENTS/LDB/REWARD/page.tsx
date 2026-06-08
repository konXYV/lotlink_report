"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useGet_Reward_LDB } from "@/app/CASES-LOTTO/hooks/Hook_Ldb";
import { formatDate } from "../../../../utils/FormatDate";
import { formatMoney } from "../../../../utils/FormartMoney";
import { Row } from "../../../../../components/Row";
import { Card } from "../../../../../components/Card";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";

const getStatusClass = (status?: string | null): string => {
  switch (status) {
    case "DONE":
      return "bg-primary-700 text-white border-primary-700";
    case "ຫາກະແຈ້ງມາ":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "ກຳລັງດຳເນີນ":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "ແກ້ໄຂແລ້ວ":
      return "text-green-600 bg-green-50 border-green-200";
    case "ປິດເຄສສຳເລັດແລ້ວ":
      return "text-slate-500 bg-slate-50 border-slate-200";
    case "ລໍຂໍ້ມູນຈາກລູກຄ້າ":
      return "text-purple-600 bg-purple-50 border-purple-200";
    default:
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
  }
};

const getStatusBadgeClass = (status?: string | null): string => {
  switch (status) {
    case "DONE":
      return "bg-primary-700 text-white";
    case "SUCCESS":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "FAILED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="mb-4 text-lg font-semibold text-slate-800 border-l-4 border-primary-700 pl-3">
      {title}
    </h2>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">{children}</div>
  );
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const billNumber = searchParams.get("billNumber") ?? "";
  const caseNumber = searchParams.get("caseNumber") ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";
  const status = typeStatus || null;

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Reward_LDB(billNumber);

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
        <div className="mx-auto max-w-fit space-y-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-lg font-medium text-white shadow-sm transition hover:bg-primary-800"
          >
            <ArrowLeft size={15} />
            ກັບຄືນ
          </button>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-12 shadow-sm">
            <AlertCircle size={40} className="text-red-400" />
            <p className="mt-4 text-base font-semibold text-slate-800">
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-2.5 text-lg font-semibold text-white transition hover:bg-primary-800 disabled:opacity-50"
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

  return (
    // ── 60% — bg-slate-50 ─────────────────────────────────────────────────
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-[90rem] space-y-6">
        {/* ── 30% primary-700 — ປຸ່ມກັບຄືນ ─────────────────────────────── */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-lg font-medium text-white shadow-sm transition hover:bg-primary-800"
        >
          <ArrowLeft size={15} />
          ກັບຄືນ
        </button>

        {/* ── Header card — 60% bg-white ──────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              {/* 10% slate-800 — heading */}
              <h1 className="text-2xl font-bold text-slate-800">
                ລາງວັນລ໋ອດເຕີຣີ - {data?.PAYBY || "-"}
              </h1>
              <p className="mt-1 text-lg text-slate-500">
                ສະຖານະເຄສ:{" "}
                <span
                  className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-lg font-semibold ${getStatusClass(status)}`}
                >
                  {status ?? "-"}
                </span>
              </p>
            </div>

            {/* 60% bg-slate-50 info panel */}
            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 p-4 text-lg sm:grid-cols-2 xl:min-w-[420px]">
              <div>
                <span className="text-slate-500">ເລກໃບບິນ:</span>
                <p className="break-all font-semibold text-slate-800">
                  {billNumber || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">ສະຖານະ:</span>
                <div className="mt-1">
                  {/* 30% primary-700 badge ຖ້າ DONE */}
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-lg font-semibold ${getStatusBadgeClass(data.STATUS)}`}
                  >
                    {data.STATUS || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* metric cards */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "ລະຫັດປີ້", value: data.TICKET?.trim() || "-" },
              { label: "ລະຫັດງວດ", value: data.DRAWID ?? "-" },
              { label: "ເວລາທຸລະກຳ", value: formatDate(data.TXTIME) },
              { label: "ຈ່າຍໂດຍ", value: data.PAYBY || "-" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 break-all text-lg font-semibold text-slate-800">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Summary cards — 30% primary-700 accent via Card ─────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="ລວມລາງວັນ" value={formatMoney(data.TOTALREWARDAMOUNT)} />
          <Card
            title="ຫຼັງຫັກພາສີ"
            value={formatMoney(data.TOTALREWARDAMOUNTAFTERTAX)}
          />
          <Card title="ລວມໂບນັດ" value={formatMoney(data.TOTALBONUS)} />
        </div>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left col — 60% bg-white */}
          <div className="space-y-6 lg:col-span-2">
            {/* ຂໍ້ມູນທຸລະກຳ */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle title="ຂໍ້ມູນທຸລະກຳ" />
              <InfoGrid>
                <Row label="ເລກໃບບິນ" value={data.BILLNUMBER || "-"} />
                <Row label="ລະຫັດປີ້" value={data.TICKET?.trim() || "-"} />
                <Row label="ລະຫັດງວດ" value={data.DRAWID ?? "-"} />
                <Row label="XREF" value={data.XREF || "-"} />
                <Row label="ເວລາທຸລະກຳ" value={formatDate(data.TXTIME)} />
                <Row label="ຈ່າຍໂດຍ" value={data.PAYBY || "-"} />
              </InfoGrid>
            </div>

            {/* ລາງວັນຕາມຕົວເລກ */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle title="ລາງວັນຕາມຕົວເລກ" />
              <InfoGrid>
                <Row label="ລາຄາ 1 ຕົວ" value={formatMoney(data.PRICE1DIGIT)} />
                <Row
                  label="ລາງວັນ 1 ຕົວ"
                  value={formatMoney(data.REWARD1DIGIT)}
                />
                <Row label="ລາຄາ 2 ຕົວ" value={formatMoney(data.PRICE2DIGIT)} />
                <Row
                  label="ລາງວັນ 2 ຕົວ"
                  value={formatMoney(data.REWARD2DIGIT)}
                />
                <Row label="ລາຄາ 3 ຕົວ" value={formatMoney(data.PRICE3DIGIT)} />
                <Row
                  label="ລາງວັນ 3 ຕົວ"
                  value={formatMoney(data.REWARD3DIGIT)}
                />
                <Row label="ລາຄາ 4 ຕົວ" value={formatMoney(data.PRICE4DIGIT)} />
                <Row
                  label="ລາງວັນ 4 ຕົວ"
                  value={formatMoney(data.REWARD4DIGIT)}
                />
                <Row label="ລາຄາ 5 ຕົວ" value={formatMoney(data.PRICE5DIGIT)} />
                <Row
                  label="ລາງວັນ 5 ຕົວ"
                  value={formatMoney(data.REWARD5DIGIT)}
                />
                <Row label="ລາຄາ 6 ຕົວ" value={formatMoney(data.PRICE6DIGIT)} />
                <Row
                  label="ລາງວັນ 6 ຕົວ"
                  value={formatMoney(data.REWARD6DIGIT)}
                />
              </InfoGrid>
            </div>

            {/* ຂໍ້ມູນໂບນັດ */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle title="ຂໍ້ມູນໂບນັດ" />
              <InfoGrid>
                <Row label="ຕິດກັນ 2" value={formatMoney(data.ADJACENT2)} />
                <Row label="ຕິດກັນ 3" value={formatMoney(data.ADJACENT3)} />
                <Row label="ຕິດກັນ 4" value={formatMoney(data.ADJACENT4)} />
                <Row label="ຕິດກັນ 5" value={formatMoney(data.ADJACENT5)} />
                <Row label="ຕິດກັນ 6" value={formatMoney(data.ADJACENT6)} />
                <Row label="ຄູ່ 2" value={formatMoney(data.DOUBLE2)} />
                <Row label="ຄູ່ 3" value={formatMoney(data.DOUBLE3)} />
                <Row label="ໃບແຈ້ງໜີ້ 2" value={formatMoney(data.INVOICE2)} />
                <Row label="ໃບແຈ້ງໜີ້ 3" value={formatMoney(data.INVOICE3)} />
              </InfoGrid>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* ສະຫຼຸບການຈ່າຍ — 60% bg-white */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle title="ສະຫຼຸບການຈ່າຍ" />
              <Row
                label="ລວມລາງວັນ"
                value={formatMoney(data.TOTALREWARDAMOUNT)}
              />
              <Row
                label="ລາງວັນຫຼັງຫັກພາສີ"
                value={formatMoney(data.TOTALREWARDAMOUNTAFTERTAX)}
              />
              <Row label="ລວມໂບນັດ" value={formatMoney(data.TOTALBONUS)} />
              <Row label="ໂບນັດເກົ່າ" value={data.TOTALBONUSOLD ?? "-"} />
              <Row label="ຈ່າຍໂດຍ" value={data.PAYBY || "-"} />
            </div>

            {/* ສະຖານະລະບົບ — 10% slate-800 dark */}
            <div className="rounded-2xl bg-slate-800 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-white border-l-4 border-primary-400 pl-3">
                ສະຖານະລະບົບ
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">ສະຖານະ</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(data.STATUS)}`}
                  >
                    {data.STATUS || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">ເລກໃບບິນ</span>
                  <span className="text-white font-medium break-all text-right max-w-[60%]">
                    {data.BILLNUMBER || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">XREF</span>
                  <span className="text-white font-medium break-all text-right max-w-[60%]">
                    {data.XREF || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* ດຳເນີນການ — 30% primary-700 */}
            <div className="rounded-2xl bg-primary-700 p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-white">
                ດຳເນີນການ
              </h2>
              <p className="mb-4 rounded-xl bg-primary-800 p-3 text-sm text-primary-100">
                ກວດສອບລາຍການລາງວັນ, ການຈ່າຍເງິນ ແລະ ໂບນັດ — ເຄສ: {caseNumber}
              </p>

              {(() => {
                const STMT_PATH: Record<string, string> = {
                  LDB: "/CASES-LOTTO/COMPONENTS/LDB/STMT",
                  JDB: "/CASES-LOTTO/COMPONENTS/JDB/STMT",
                };
                const pathname = STMT_PATH[data.PAYBY ?? ""];

                return pathname ? (
                  <Link
                    href={{
                      pathname,
                      query: {
                        billNumber: data.BILLNUMBER?.trim() || "",
                        caseNumber,
                        type_status: status ?? "",
                      },
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-lg font-semibold text-primary-700 transition hover:bg-slate-50"
                  >
                    STMT - ຈ່າຍລາງວັນ
                    <RefreshCw size={15} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-xl bg-primary-800 px-4 py-3 text-lg font-semibold text-primary-300"
                  >
                    ບໍ່ມີເສັ້ນທາງສຳລັບ {data.PAYBY || "ປະເພດນີ້"}
                  </button>
                );
              })()}

              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-500 bg-transparent px-4 py-2.5 text-lg font-medium text-white transition hover:bg-primary-600 disabled:opacity-50"
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

export default function REWARD_LDB_PAGE() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex items-center gap-2 text-lg text-slate-400">
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
