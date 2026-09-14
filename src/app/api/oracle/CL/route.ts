// src/app/api/oracle/CL/route.ts
// ─── Entry point ສຳລັບ CL_BCEL_reconciliation — ໃຊ້ pool ແຍກຕ່າງຫາກ (172.22.7.53) ─
import { NextRequest, NextResponse } from "next/server";
import {
  getClBankReconciliation,
  getClBankReconciliationByDraw,
} from "./cl_bcel.repo";

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const view = params.get("view") ?? "bank_reconciliation";
  const dateFrom = params.get("date_from") ?? undefined;
  const dateTo = params.get("date_to") ?? undefined;

  try {
    switch (view) {
      case "bank_reconciliation": {
        const rows = await getClBankReconciliation(dateFrom, dateTo);
        return NextResponse.json({ rows });
      }
      case "bank_reconciliation_by_draw": {
        const rows = await getClBankReconciliationByDraw(dateFrom, dateTo);
        return NextResponse.json({ rows });
      }
      default:
        return NextResponse.json(
          { error: `view "${view}" ບໍ່ມີ handler` },
          { status: 400 },
        );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CL Oracle API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
