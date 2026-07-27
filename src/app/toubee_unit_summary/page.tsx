"use client";

import UnitLedgerPageBase, {
  type UnitLedgerPageConfig,
} from "@/components/reports/UnitLedgerPageBase";

const CONFIG: UnitLedgerPageConfig = {
  pageTitle: "ສັງລວມຍອດຂາຍ ຕູບີ່ (ຕາມແຂວງ)",
  pageSubtitle: "ຍອດຂາຍ ແລະ ຍອດຕ້ອງຖອກ ຂອງແຂວງ ຕູບີ່, ພ້ອມ Payout ຕາມ User ຂອງງວດດຽວກັນ",
  entityLabel: "ແຂວງ",
  hasRemainingCol: false,
  defaultRate: 0.38,
  unitSellVariant: "toubee",
  titleLines: [
    "ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",
    "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",
    "ສັງລວມຍອດຂາຍ ຕູບີ່ (ຕາມແຂວງ)",
  ],
  fileNamePrefix: "Toubee_UnitSummary",
  activityExport: "unit_ledger_toubee_export",
  activityPrint: "unit_ledger_toubee_print",
};

export default function ToubeeUnitSummaryPage() {
  return <UnitLedgerPageBase config={CONFIG} />;
}
