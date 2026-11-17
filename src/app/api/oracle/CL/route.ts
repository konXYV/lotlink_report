// src/app/api/oracle/CL/route.ts
// ─── Entry point ສຳລັບ CL_BCEL_reconciliation — ໃຊ້ pool ແຍກຕ່າງຫາກ (172.22.7.53) ─
import { NextRequest, NextResponse } from "next/server";
import {
  getClBankReconciliation,
  getClBankReconciliationByDraw,
} from "./cl_bcel.repo";
import { getClLottoTaxRows, getClLottoPrizeTaxRows } from "./cl_lotto_tax.repo";
import { getClSalesByDraw, getClPrizeByDraw } from "./cl_sales_prize.repo";

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
      case "sales_by_draw":
      case "prize_by_draw": {
        // ບັງຄັບໃຫ້ມີຊ່ວງວັນທີ — ກັນດຶງທັງຕາຕະລາງ
        if (!dateFrom || !dateTo) {
          return NextResponse.json(
            { error: "ຕ້ອງລະບຸ date_from ແລະ date_to" },
            { status: 400 },
          );
        }
        const data =
          view === "sales_by_draw"
            ? await getClSalesByDraw(dateFrom, dateTo)
            : await getClPrizeByDraw(dateFrom, dateTo);
        return NextResponse.json(data); // { rows, unassigned }
      }
      case "lotto_tax_rows":
      case "lotto_prize_tax_rows": {
        // ບັງຄັບໃຫ້ມີຊ່ວງວັນທີ — ກັນດຶງທັງຕາຕະລາງ
        if (!dateFrom || !dateTo) {
          return NextResponse.json(
            { error: "ຕ້ອງລະບຸ date_from ແລະ date_to" },
            { status: 400 },
          );
        }
        const rows =
          view === "lotto_tax_rows"
            ? await getClLottoTaxRows(dateFrom, dateTo)
            : await getClLottoPrizeTaxRows(dateFrom, dateTo);
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
