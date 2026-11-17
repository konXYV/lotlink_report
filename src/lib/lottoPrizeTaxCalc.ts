// lib/lottoPrizeTaxCalc.ts — ນິຍາມລາຍງານ "ອາກອນເງິນລາງວັນ" (3 ຊ່ວງເງິນລາງວັນຕໍ່ໃບ)
//   ຊ່ວງ 1: ລາງວັນ <= 10 ລ້ານ            → ບໍ່ເສຍອາກອນ (ອາກອນ = 0)
//   ຊ່ວງ 2: ລາງວັນ > 10 ລ້ານ ແລະ < 50 ລ້ານ → ອາກອນ 5% × (ລາງວັນ − 10 ລ້ານ) ຕໍ່ໃບ
//   ຊ່ວງ 3: ລາງວັນ >= 50 ລ້ານ             → ອາກອນ 5% × (ລາງວັນ − 10 ລ້ານ) ຕໍ່ໃບ
// ສູດ 5% ຂອງສ່ວນເກີນ 10 ລ້ານ ຖອດຈາກລາຍງານຕົ້ນສະບັບ ແລະ ກວດແລ້ວກົງທຸກຄໍລຳ.
import type { ReportDef } from "./lottoReportCore";

export const PRIZE_TAX_RATE = 0.05;
export const PRIZE_EXEMPT = 10_000_000; // ສ່ວນທີ່ບໍ່ຖືກຄິດອາກອນຕໍ່ໃບ = ເກນຊ່ວງ 1
export const PRIZE_BAND_MAX = 50_000_000; // ເກນຊ່ວງ 2 / ຊ່ວງ 3 (ໃຊ້ໃນ SQL ຝັ່ງ repo)

export const prizeTaxReport: ReportDef = {
  id: "prize",
  title: "ຕາຕະລາງ ຄິດໄລ່ ອາກອນເງິນລາງວັນ",
  apiView: "lotto_prize_tax_rows",
  fileName: "CL_Lotto_Prize_Tax",
  baseKeys: ["LOW_SUM", "MID_SUM", "MID_CNT", "HIGH_SUM", "HIGH_CNT"],
  items: [
    { code: "A", label: "ຍອດຖືກລາງວັນ <=10ລ້ານ", formula: "" },
    { code: "B", label: "ຍອດຖືກລາງວັນ >10ລ້ານ ແລະ <50ລ້ານ", formula: "" },
    { code: "C", label: "ຍອດຖືກລາງວັນ >=50ລ້ານ", formula: "" },
    { code: "D", label: "ລວມຍອດຖືກລາງວັນທັງໝົດ", formula: "[A]+[B]+[C]", highlight: true },
    { code: "E", label: "ອາກອນລາງວັນ <=10ລ້ານ", formula: "ບໍ່ເສຍອາກອນ" },
    { code: "F", label: "ອາກອນລາງວັນ >10ລ້ານ ແລະ <50ລ້ານ", formula: "" },
    { code: "G", label: "ອາກອນລາງວັນ >=50ລ້ານ", formula: "" },
    { code: "H", label: "ລວມອາກອນລາງວັນທັງໝົດ", formula: "[E]+[F]+[G]", grand: true },
  ],
  derive: (b) => {
    const E = 0;
    const F = PRIZE_TAX_RATE * (b.MID_SUM - PRIZE_EXEMPT * b.MID_CNT);
    const G = PRIZE_TAX_RATE * (b.HIGH_SUM - PRIZE_EXEMPT * b.HIGH_CNT);
    return {
      A: b.LOW_SUM,
      B: b.MID_SUM,
      C: b.HIGH_SUM,
      D: b.LOW_SUM + b.MID_SUM + b.HIGH_SUM,
      E,
      F,
      G,
      H: E + F + G,
    };
  },
};
