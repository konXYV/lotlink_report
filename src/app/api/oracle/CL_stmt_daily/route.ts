// src/app/api/oracle/CL_stmt_daily/route.ts
// GET /api/oracle/CL_stmt_daily?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD  →  { days, prior, accts }
// (ໜ້າເວັບແປງ "ເດືອນ" ເປັນ ວັນທີ 1 – ວັນສຸດທ້າຍ ກ່ອນເອີ້ນ) · route ແຍກຕ່າງຫາກ — ບໍ່ແຕະ route ເດີມ
import { NextRequest, NextResponse } from "next/server";
import { getClStmtDaily } from "./stmt_daily.repo";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const dateFrom = p.get("date_from") ?? "";
  const dateTo = p.get("date_to") ?? "";
  if (!ISO.test(dateFrom) || !ISO.test(dateTo)) {
    return NextResponse.json({ error: "ຕ້ອງລະບຸ date_from ແລະ date_to (YYYY-MM-DD)" }, { status: 400 });
  }
  if (dateFrom > dateTo) {
    return NextResponse.json({ error: "ວັນທີເລີ່ມຕົ້ນຕ້ອງບໍ່ເກີນວັນທີສິ້ນສຸດ" }, { status: 400 });
  }
  const span = (Date.parse(dateTo) - Date.parse(dateFrom)) / 86400000 + 1;
  if (!(span <= MAX_DAYS)) {
    return NextResponse.json({ error: `ເລືອກຊ່ວງວັນທີໄດ້ບໍ່ເກີນ ${MAX_DAYS} ວັນ` }, { status: 400 });
  }
  try {
    return NextResponse.json(await getClStmtDaily(dateFrom, dateTo));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CL Stmt Daily API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
