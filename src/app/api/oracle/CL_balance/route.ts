// src/app/api/oracle/CL_balance/route.ts
// GET /api/oracle/CL_balance?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD  →  { rows }
// route ແຍກຕ່າງຫາກ — ບໍ່ແຕະ /api/oracle/CL/route.ts ເດີມ
import { NextRequest, NextResponse } from "next/server";
import { getClBalanceRows } from "./balance.repo";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

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
  try {
    const rows = await getClBalanceRows(dateFrom, dateTo);
    return NextResponse.json({ rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CL Balance API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
