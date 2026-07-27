"use client";

import UnitLedgerPageBase, {
  type UnitLedgerPageConfig,
} from "@/components/reports/UnitLedgerPageBase";

const CONFIG: UnitLedgerPageConfig = {
  pageTitle: "ຍອດຖອກລາຍເດືອນ (ຕາມແຂວງ)",
  pageSubtitle: "ຍອດຂາຍ, ເຫຼືອ ແລະ ຍອດຕ້ອງຖອກ ຕາມແຂວງ, ພ້ອມ Payout ຕາມ User ຂອງງວດດຽວກັນ",
  entityLabel: "ແຂວງ",
  hasRemainingCol: true,
  defaultRate: 0.38,
  unitSellVariant: "province",
  titleLines: [
    "ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
    "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",
    "ຍອດຖອກລາຍເດືອນ (ຕາມແຂວງ)",
  ],
  fileNamePrefix: "WithdrawSummary_Province",
  activityExport: "unit_ledger_withdraw_export",
  activityPrint: "unit_ledger_withdraw_print",
};

export default function WithdrawSummaryByProvincePage() {
  return <UnitLedgerPageBase config={CONFIG} />;
}
