// src/app/api/oracle/route.ts
// ─── Entry point — validates view key, opens connection, delegates to handlers ─
import { NextRequest, NextResponse } from "next/server";
import { VALID_VIEWS, type ViewKey } from "./config/constants";
import { openConnection, getOutFormat } from "./lib/connection";
import { Reconciliation_repo } from "./repo/LDB_recon_repo";

// Sell
import { handleSell, handleSellOptions, handleDrawid, handleMonth, handleRoundids } from "./handlers/sell.handler";
// Reward
import { handleReward, handleRewardDrawid, handleRewardChannel } from "./handlers/reward.handler";
// Payout & BCEL refund
import {
  handlePayoutDrawid, handlePayoutUsers, handleBcelRefund,
  handleBcelOnepayRefundByDraw, handleBcelOnepayRefundByDrawWithDates,
  handleBcelOnepayRefundByDate, handleBcelOnepayRefundByDateWithDraws,
} from "./handlers/payout.handler";
// BCEL reconciliation
import { handleBcelRewardSummary, handleBcelTax5Items, handleBcelOtherItems, handleBankReconciliation } from "./handlers/bcel.handler";
// JDB
import { handleJdbRewardSummary, handleJdbTax5Items, handleJdbOtherItems, handleJdbBankReconciliation, handleJdbSellReconciliation } from "./handlers/jdb.handler";
// LDB
import { handleLdbRewardSummary, handleLdbTaxRewardItems, handleLdbOtherItems } from "./handlers/ldb.handler";
// Summary & channel
import { handleSellSummaryDrawIds, handleSellSummaryByDraw, handleBcelOnepayReconByDraw, handleSellChannelByDraw, handleSellChannelByMonth } from "./handlers/summary.handler";

export async function GET(req: NextRequest) {
  const params  = new URL(req.url).searchParams;
  const viewKey = params.get("view") ?? "";

  if (!VALID_VIEWS.includes(viewKey as ViewKey)) {
    return NextResponse.json(
      { error: `view ບໍ່ຖືກຕ້ອງ: "${viewKey}". ໃຊ້: ${VALID_VIEWS.join(" | ")}` },
      { status: 400 },
    );
  }

  // ── LDB_RECONCILIATION uses its own connection pool (withConnection) ───────
  if (viewKey === "LDB_RECONCILIATION") {
    const rows = await Reconciliation_repo(
      params.get("date_from") ?? undefined,
      params.get("date_to")   ?? undefined,
      params.get("account")   ?? undefined,
    );
    return NextResponse.json({ data: rows });
  }

  // ── All other views share a single connection per request ─────────────────
  let connection;
  try {
    connection       = await openConnection();
    const OPT_OBJ    = await getOutFormat();

    switch (viewKey as ViewKey) {
      // ── Sell ─────────────────────────────────────────────────────────────
      case "sell_options":   return await handleSellOptions(connection, OPT_OBJ);
      case "sell":           return await handleSell(connection, OPT_OBJ, params);
      case "drawid":         return await handleDrawid(connection, OPT_OBJ, params);
      case "month":          return await handleMonth(connection, OPT_OBJ, params);
      case "roundids":       return await handleRoundids(connection, OPT_OBJ);

      // ── Reward ───────────────────────────────────────────────────────────
      case "reward":         return await handleReward(connection, OPT_OBJ, params);
      case "reward_drawid":  return await handleRewardDrawid(connection, OPT_OBJ, params);
      case "reward_channel": return await handleRewardChannel(connection, OPT_OBJ, params);

      // ── Payout ───────────────────────────────────────────────────────────
      case "payout_drawid":  return await handlePayoutDrawid(connection, OPT_OBJ, params);
      case "payout_users":   return await handlePayoutUsers(connection, OPT_OBJ, params);

      // ── BCEL Refund ───────────────────────────────────────────────────────
      case "bcel_refund":    return await handleBcelRefund(connection, OPT_OBJ, params);

      // ── BCEL OnePay Refund ────────────────────────────────────────────────
      case "bcel_onepay_refund_by_draw":            return await handleBcelOnepayRefundByDraw(connection, OPT_OBJ, params);
      case "bcel_onepay_refund_by_draw_with_dates": return await handleBcelOnepayRefundByDrawWithDates(connection, OPT_OBJ, params);
      case "bcel_onepay_refund_by_date":            return await handleBcelOnepayRefundByDate(connection, OPT_OBJ, params);
      case "bcel_onepay_refund_by_date_with_draws": return await handleBcelOnepayRefundByDateWithDraws(connection, OPT_OBJ, params);

      // ── BCEL Reconciliation ───────────────────────────────────────────────
      case "bcel_reward_summary":  return await handleBcelRewardSummary(connection, OPT_OBJ, params);
      case "bcel_tax5_items":      return await handleBcelTax5Items(connection, OPT_OBJ, params);
      case "bcel_other_items":     return await handleBcelOtherItems(connection, OPT_OBJ, params);
      case "bank_reconciliation":  return await handleBankReconciliation(connection, OPT_OBJ, params);

      // ── BCEL OnePay Recon ────────────────────────────────────────────────
      case "bcel_onepay_recon_by_draw": return await handleBcelOnepayReconByDraw(connection, OPT_OBJ, params);
      // Note: bcel_onepay_recon_by_date not implemented in original — add here when ready

      // ── JDB ──────────────────────────────────────────────────────────────
      case "jdb_reward_summary":       return await handleJdbRewardSummary(connection, OPT_OBJ, params);
      case "jdb_tax5_items":           return await handleJdbTax5Items(connection, OPT_OBJ, params);
      case "jdb_other_items":          return await handleJdbOtherItems(connection, OPT_OBJ, params);
      case "jdb_bank_reconciliation":  return await handleJdbBankReconciliation(connection, OPT_OBJ, params);
      case "jdb_sell_reconciliation":  return await handleJdbSellReconciliation(connection, OPT_OBJ, params);

      // ── LDB ──────────────────────────────────────────────────────────────
      case "ldb_reward_summary":    return await handleLdbRewardSummary(connection, OPT_OBJ, params);
      case "ldb_tax_reward_items":  return await handleLdbTaxRewardItems(connection, OPT_OBJ, params);
      case "ldb_other_items":       return await handleLdbOtherItems(connection, OPT_OBJ, params);

      // ── Sell Summary ──────────────────────────────────────────────────────
      case "sell_summary_draw_ids": return await handleSellSummaryDrawIds(connection, OPT_OBJ);
      case "sell_summary_by_draw":  return await handleSellSummaryByDraw(connection, OPT_OBJ, params);

      // ── Sell Channel ──────────────────────────────────────────────────────
      case "sell_channel_by_draw":  return await handleSellChannelByDraw(connection, OPT_OBJ, params);
      case "sell_channel_by_month": return await handleSellChannelByMonth(connection, OPT_OBJ, params);

      default:
        return NextResponse.json({ error: `view "${viewKey}" ບໍ່ມີ handler` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Oracle API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
