// lib/lottoTaxCalc.ts — ນິຍາມລາຍງານ "ອາກອນມູນຄ່າເພີ່ມ (ອມພ) + ອາກອນຊົມໃຊ້ (ອຄຊ)"
//   A = ຍອດຂາຍ · B = ຍອດຈ່າຍລາງວັນ · C = A-B
//   D = (C*100/110)*10%  · E = C-D · F = (E*100/125)*25% · G = D+F
import type { ReportDef } from "./lottoReportCore";

export const vatReport: ReportDef = {
  id: "vat",
  title: "ຕາຕະລາງຄິດໄລ່ ອາກອນມູນຄ່າເພີ່ມ ແລະ ອາກອນຊົມໃຊ້",
  apiView: "lotto_tax_rows",
  fileName: "CL_Lotto_VAT_Excise",
  baseKeys: ["A_SALES", "B_PAID"],
  items: [
    { code: "A", label: "ຍອດຂາຍ", formula: "" },
    { code: "B", label: "ຍອດຈ່າຍລາງວັນ", formula: "" },
    { code: "C", label: "ສ່ວນຕ່າງ ຍອດຂາຍ - ຍອດລາງວັນ", formula: "([A] - [B])" },
    { code: "D", label: "ອາກອນມູນຄ່າເພີ່ມ - VAT 10%", formula: "(([C]*100/110)*10%)", highlight: true },
    { code: "E", label: "ສ່ວນຕ່າງ ຫຼັງ VAT", formula: "[C]-[D]" },
    { code: "F", label: "ອາກອນຊົມໃຊ້", formula: "(([E]*100/125)*25%)", highlight: true },
    { code: "G", label: "ລວມອາກອນ ອມພ + ອຄຊ", formula: "[D] + [F]", grand: true },
  ],
  derive: (b) => {
    const a = b.A_SALES;
    const bb = b.B_PAID;
    const c = a - bb;
    const d = ((c * 100) / 110) * 0.1;
    const e = c - d;
    const f = ((e * 100) / 125) * 0.25;
    return { A: a, B: bb, C: c, D: d, E: e, F: f, G: d + f };
  },
};
