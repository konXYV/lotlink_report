// src/app/api/oracle/Cases_support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Spin_Repo } from "./repo.spin";

const repo = new Spin_Repo();

// ── GET /api/oracle/SPIN?action=GetOrder_Spin_ById&id=xxx ───────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams; // ✅ ใช้ nextUrl แทน new URL(req.url)
  const action = p.get("action") ?? "list";

  try {
    if (action === "OrderSpin") {
      const caseNumber = p.get("caseNumber")?.trim();

      if (!caseNumber) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ caseNumber" },
          { status: 400 },
        );
      }

      const row = await repo.findByIdOrder(caseNumber);

      if (!row) {
        return NextResponse.json(
          { success: false, message: `ບໍ່ພົບຂໍ້ມູນ id: ${caseNumber}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: row });
    }

    if (action === "StmtSpin") {
      const caseNumber = p.get("caseNumber")?.trim();

      if (!caseNumber) {
        return NextResponse.json(
          { success: false, message: "ຕ້ອງລະບຸ caseNumber" },
          { status: 400 },
        );
      }

      const row = await repo.findByIdSpin_Stmt(caseNumber);

      if (!row) {
        return NextResponse.json(
          { success: false, message: `ບໍ່ພົບຂໍ້ມູນ caseNumber: ${caseNumber}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: row });
    }

    // action ไม่รู้จัก
    return NextResponse.json(
      {
        success: false,
        message: `action ບໍ່ຖືກຕ້ອງ: "${action}" — ໃຊ້: GetOrder_Spin_ById`,
      },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cases_support GET]", msg);

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development"
            ? msg
            : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່",
      },
      { status: 500 },
    );
  }
}
