"use client";
import LottoReportPage from "@/components/reports/LottoReportPage";
import { prizeTaxReport } from "@/lib/lottoPrizeTaxCalc";

// ອາກອນເງິນລາງວັນ — ສະຫລຸບ · ລາຍເດືອນ · ລາຍວັນ · ຕາມງວດ
export default function ClLottoPrizeTaxReportPage() {
  return <LottoReportPage def={prizeTaxReport} />;
}
