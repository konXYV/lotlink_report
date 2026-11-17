"use client";
import React, { useState } from "react";
import { Search, AlertCircle, Receipt } from "lucide-react";

type Row = Record<string, string | number | null>;

const FIELDS: { key: string; label: string; num?: boolean }[] = [
  { key: "LOTO_BILL_NO", label: "ເລກບິນ (LOTO_BILL_NO)" },
  { key: "TICKET", label: "TICKET" },
  { key: "DRAW_ID", label: "ງວດ" },
  { key: "DRAW_DATE", label: "ວັນທີອອກ" },
  { key: "ORDER_DATE", label: "ວັນທີສັ່ງຊື້" },
  { key: "SALE_DATE", label: "ວັນທີຂາຍ" },
  { key: "EXPIRE_DATE", label: "ວັນຫມົດອາຍຸ" },
  { key: "TOTALSALE", label: "ຍອດຂາຍ", num: true },
  { key: "ORDER_STATUS", label: "ORDER_STATUS" },
  { key: "LOTTO_STATUS_ID", label: "LOTTO_STATUS_ID" },
  { key: "SETTLED", label: "SETTLED" },
  { key: "USERID", label: "USERID" },
  { key: "B1USERID", label: "B1USERID" },
  { key: "PAYMENT_ACC_NO", label: "PAYMENT_ACC_NO" },
  { key: "PAYMENT_ACC_CCY", label: "PAYMENT_ACC_CCY" },
  { key: "PAYMENT_ACC_ID", label: "PAYMENT_ACC_ID" },
  { key: "REWARD_ACC_ID", label: "REWARD_ACC_ID" },
  { key: "PJRRNO", label: "PJRRNO" },
  { key: "PROVIDER", label: "PROVIDER" },
  { key: "APP", label: "APP" },
  { key: "REFERBYLOTTOUSER", label: "REFERBYLOTTOUSER" },
  { key: "HIDE", label: "HIDE" },
  { key: "HIDECODE", label: "HIDECODE" },
  { key: "MEEJAICODE", label: "MEEJAICODE" },
  { key: "MEEJAIPERCENT", label: "MEEJAIPERCENT", num: true },
  { key: "MEEJAIAMOUNT", label: "MEEJAIAMOUNT", num: true },
  { key: "MEEJAIPHONE", label: "MEEJAIPHONE" },
  { key: "MEEJAINAME", label: "MEEJAINAME" },
  { key: "POINT_ISSUED", label: "POINT_ISSUED", num: true },
  { key: "POINT_ISSUED_REFERENCE", label: "POINT_ISSUED_REFERENCE" },
  { key: "POINT_CONSUMED", label: "POINT_CONSUMED", num: true },
  { key: "POINT_CONSUMED_REFERENCE", label: "POINT_CONSUMED_REFERENCE" },
  { key: "NOTE", label: "NOTE" },
];

const show = (v: string | number | null | undefined, num?: boolean) => {
  if (v == null || v === "") return "-";
  if (num && !isNaN(Number(v))) return Number(v).toLocaleString("en-US");
  return String(v);
};

export default function LottoOrderBcelCheckPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!input.trim()) return;
    setSearched(true);
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        view: "lotto_order_bcel_bill_check",
        bills: input,
      });
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ເກີດຂໍ້ຜິດພາດ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
      setNotFound(Array.isArray(json.notFound) ? json.notFound : []);
    } catch (e: unknown) {
      setRows([]);
      setNotFound([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput("");
    setRows([]);
    setNotFound([]);
    setError(null);
    setSearched(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <Receipt size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-800">
            ກວດບິນ LOTTO_ORDER_BCEL
          </h1>
          <p className="text-xs text-slate-400">
            ຄົ້ນຫາຕາມ LOTO_BILL_NO (ໃສ່ໄດ້ຫຼາຍບິນ ແຍກດ້ວຍຍະຫວ່າງ, ຈຸດ, ຫຼື ແຖວໃໝ່)
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
          <label className="text-xs text-slate-500 font-medium">ເລກບິນ</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
            rows={2}
            placeholder="ໃສ່ LOTO_BILL_NO ແລ້ວກົດ Enter"
            className="px-3 py-2 text-sm font-mono border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
          >
            <Search size={13} /> {loading ? "ກຳລັງຄົ້ນຫາ..." : "ຄົ້ນຫາ"}
          </button>
          {(input || searched) && (
            <button
              onClick={handleClear}
              className="px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
            >
              ລ້າງ
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">ຄົ້ນຫາບໍ່ສຳເລັດ</p>
            <p className="text-xs opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {searched && !loading && !error && (
        <div className="text-xs text-slate-600">
          ພົບ <b className="text-blue-700">{rows.length}</b> ລາຍການ
          {notFound.length > 0 && (
            <span className="ml-3 text-red-600">
              ບໍ່ພົບ {notFound.length} ບິນ: <span className="font-mono">{notFound.join(", ")}</span>
            </span>
          )}
        </div>
      )}

      {rows.map((r, i) => (
        <div
          key={`${r.LOTO_BILL_NO}-${r.TICKET}-${i}`}
          className="bg-white border border-black rounded-xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-black bg-blue-50 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-sm font-bold text-blue-700 font-mono">
              {show(r.LOTO_BILL_NO)}
            </span>
            <span className="text-xs text-slate-600">
              ງວດ {show(r.DRAW_ID)} · ຍອດ {show(r.TOTALSALE, true)} · ສະຖານະ {show(r.ORDER_STATUS)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ...FIELDS.filter((f) => f.key !== "LOTO_BILL_NO"),
              // any column in the table that is not listed above is still shown
              ...Object.keys(r)
                .filter((k) => !FIELDS.some((f) => f.key === k))
                .map((k) => ({ key: k, label: k, num: false })),
            ].map((f) => (
              <div
                key={f.key}
                className="flex justify-between gap-3 px-3 py-1.5 border-b border-r border-slate-200 text-xs"
              >
                <span className="text-slate-500">{f.label}</span>
                <span className="font-mono text-slate-800 text-right break-all">
                  {show(r[f.key], f.num)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
