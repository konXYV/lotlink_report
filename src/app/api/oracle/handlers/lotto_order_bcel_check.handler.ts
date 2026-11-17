import { NextResponse } from "next/server";
import { VIEWS } from "../config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OPT = any;

// ════════════════════════════════════════════════════════════════════════
//  ກວດບິນ LOTTO_ORDER_BCEL ຕາມ LOTO_BILL_NO (ຄົ້ນຫາໄດ້ຫຼາຍບິນ, ສູງສຸດ 50)
// ════════════════════════════════════════════════════════════════════════
const MAX_BILLS = 50;

function fmtValue(v: unknown): unknown {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  return v;
}

export async function handleLottoOrderBcelBillCheck(
  conn: Conn,
  OPT_OBJ: OPT,
  params: URLSearchParams,
) {
  const bills = Array.from(
    new Set(
      (params.get("bills") ?? "")
        .split(/[\s,;]+/)
        .map((b) => b.trim())
        .filter(Boolean),
    ),
  );

  if (bills.length === 0) {
    return NextResponse.json({ error: "ກະລຸນາໃສ່ເລກບິນ" }, { status: 400 });
  }
  if (bills.length > MAX_BILLS) {
    return NextResponse.json(
      { error: `ຄົ້ນຫາໄດ້ສູງສຸດ ${MAX_BILLS} ບິນຕໍ່ຄັ້ງ` },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binds: Record<string, any> = {};
  const placeholders = bills.map((b, i) => {
    binds[`b${i}`] = b;
    return `:b${i}`;
  });

  const sql = `
    SELECT *
    FROM   ${VIEWS.LOTTO_ORDER_BCEL}
    WHERE  TRIM(LOTO_BILL_NO) IN (${placeholders.join(", ")})
    ORDER  BY ORDER_DATE DESC, LOTO_BILL_NO`;

  const res = await conn.execute(sql, binds, OPT_OBJ);
  const rows = (res.rows ?? []).map((r: Record<string, unknown>) => {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(r)) o[k] = fmtValue(r[k]);
    return o;
  });

  const found = new Set(rows.map((r: Record<string, unknown>) => String(r.LOTO_BILL_NO ?? "").trim()));
  return NextResponse.json({
    rows,
    notFound: bills.filter((b) => !found.has(b)),
  });
}
