// src/app/api/oracle/CL_tax_monthly/route.ts
// GET /api/oracle/CL_tax_monthly?month=YYYY-MM → { DOG:{sales,paid}, PUP:{sales,paid} }
// route ແຍກຕ່າງຫາກ — ບໍ່ແຕະ /api/oracle/CL/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getClTaxMonthly, MONTH_RE } from "./tax_monthly.repo";

export async function GET(req: NextRequest) {
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "ຕ້ອງລະບຸ month ຮູບແບບ YYYY-MM" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getClTaxMonthly(month));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CL Tax Monthly API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
