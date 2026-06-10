// ─── Oracle DB Config ──────────────────────────────────────────────────────
export const ORA_CONFIG = {
  host:     process.env.ORACLE_HOST     ?? "172.22.7.41",
  port:     Number(process.env.ORACLE_PORT ?? "1521"),
  sid:      process.env.ORACLE_SID      ?? "centralrptde",
  user:     process.env.ORACLE_USER     ?? "ECOMMERCE2026",
  password: process.env.ORACLE_PASSWORD ?? "splususer12",
};

// ─── Table / View Names ────────────────────────────────────────────────────
export const VIEWS = {
  SELL:           "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL",
  DRAWID:         "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL_DRAWID",
  MONTH:          "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL_MONTH",
  REWARD:         "ECOMMERCE2026.APP_V_SCN_REWARD",
  REWARD_DRAWID:  "ECOMMERCE2026.APP_V_SCN_REWARD_DRAWID",
  REWARD_CHANNEL: "ECOMMERCE2026.APP_V_SCN_REWARD_DRAWID_CHANEL",
  BCEL_REFUND:    "ECOMMERCE2026.APP_V_SCN_BCEL_REFUND",
  BCEL_STMT:      "ECOMMERCE2026.BCEL_STMT",
  BCEL_ECOM_SCN:  "ECOMMERCE2026.BCEL_ECOM_SCN",
  LOTLINK_BILL:   "ECOMMERCE2026.LOTLINK_BILL",
  BCEL_ONEPAY:    "ECOMMERCE2026.BCEL_ONEPAY_TXN_SX",
  JDB_STMT:       "ECOMMERCE2026.JDB_STMT",
  LDB_STMT:       "ECOMMERCE2026.LDB_STMT",
} as const;

// ─── Bank Account Numbers ──────────────────────────────────────────────────
export const ACCOUNTS = {
  BCEL:       "2201300002167",
  BCEL_ONEPAY:"0901300002155",
  JDB:        "02920020000003191",
  JDB_3180:   "02920020000003180",
  LDB:        "0302000010005221",
} as const;

// ─── Allowed sort columns (whitelist against SQL injection) ────────────────
export const SELL_SORT_COLS = new Set([
  "LOTTO_BILL_NO", "DRAWID", "DRAW_DATE", "PAY_BY", "OWNER",
  "BILL_AMT", "PAYMENT_AMT", "DIFF_PAYMENT", "SCN_PRO_AMT",
  "SCN_COUPON_AMT", "DISCOUNT_15_PERCENT", "DIFF_PRO",
  "COM_5_PERCENT", "FINAL_SCN_COM",
]);

export const BCEL_SORT_COLS = new Set(["TID", "TT_TXN", "REFUND_AMT"]);

// ─── Valid view keys ───────────────────────────────────────────────────────
export const VALID_VIEWS = [
  "sell", "sell_options", "drawid", "month", "roundids",
  "reward", "reward_drawid", "reward_channel",
  "bcel_refund", "payout_drawid", "payout_users",
  "bcel_reward_summary", "bcel_tax5_items", "bank_reconciliation",
  "jdb_reward_summary", "jdb_tax5_items", "jdb_other_items", "jdb_bank_reconciliation",
  "ldb_reward_summary", "ldb_tax_reward_items", "ldb_other_items",
  "bcel_other_items", "LDB_RECONCILIATION",
  "sell_summary_by_draw", "sell_summary_draw_ids",
  "bcel_onepay_refund_by_draw", "bcel_onepay_refund_by_draw_with_dates",
  "bcel_onepay_refund_by_date", "bcel_onepay_refund_by_date_with_draws",
  "bcel_onepay_recon_by_draw", "bcel_onepay_recon_by_date",
  "jdb_sell_reconciliation", "sell_channel_by_draw", "sell_channel_by_month",
] as const;

export type ViewKey = (typeof VALID_VIEWS)[number];
