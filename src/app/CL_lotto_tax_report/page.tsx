"use client";
import LottoReportPage from "@/components/reports/LottoReportPage";
import { vatReport } from "@/lib/lottoTaxCalc";

// ອມພ (VAT 10%) + ອຄຊ (ອາກອນຊົມໃຊ້ 25%) — ສະຫລຸບ · ລາຍເດືອນ · ລາຍວັນ · ຕາມງວດ
export default function ClLottoTaxReportPage() {
  return <LottoReportPage def={vatReport} />;
}
