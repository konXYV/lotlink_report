"use client";

import UnitLedgerPageBase, {
  type UnitLedgerPageConfig,
} from "@/components/reports/UnitLedgerPageBase";

const CONFIG: UnitLedgerPageConfig = {
  pageTitle: "ສັງລວມການຂາຍ ນະຄອນຫຼວງ (ຕາມໜ່ວຍ)",
  pageSubtitle: "ຍອດຂາຍ ແລະ ຍອດຕ້ອງຖອກ ຕາມແຕ່ລະໜ່ວຍ, ພ້ອມ Payout ຕາມ User ຂອງງວດດຽວກັນ",
  entityLabel: "ໜ່ວຍ",
  hasRemainingCol: false,
  defaultRate: 0.38,
  unitSellVariant: "nkl",
  titleLines: [
    "ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
    "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",
    "ສັງລວມການຂາຍ ນະຄອນຫຼວງ (ຕາມໜ່ວຍ)",
  ],
  fileNamePrefix: "NKL_UnitSellSummary",
  activityExport: "unit_ledger_nkl_export",
  activityPrint: "unit_ledger_nkl_print",
};

export default function NklUnitSellSummaryPage() {
  return <UnitLedgerPageBase config={CONFIG} />;
}
