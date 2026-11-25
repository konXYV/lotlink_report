// lib/clTaxMonthlyCore.ts
// ─── ສູດຄິດໄລ່ ຕາຕະລາງ ອມພ / ອກຊ / ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ (ຕາມຕາຕະລາງຂອງຫົວໜ້າ) ───
//  A  = ຍອດຂາຍ (ທັງໝົດໃນເດືອນທີ່ເລືອກ)
//  B  = ຍອດຈ່າຍເງິນລາງວັນ (ທັງໝົດໃນເດືອນທີ່ເລືອກ)
//  C  = A − B                         ລາຍຮັບຫຼັງຫັກລາງວັນ
//  E  = ROUND(C × 100/110 × 10%, 0)   ອມພ (10%)
//  D  = C − E                         ລາຍຮັບນອກ ອມພ
//  G  = ROUND(D × 100/130 × 30%, 0)   ອກຊ (30%)
//  F  = D − G                         ລາຍຮັບນອກ ອມພ ແລະ ອກຊ
//  H  = E + G                         ລວມ ອມພ, ອກຊ ຕ້ອງມອບ
//  ຊ່ອງ "ລວມທັງໝົດ" = ຊ່ອງ ນ້ອງໝານຳໂຊກ + ຊ່ອງ ປູປາເຕົ້າມະຫາໂຊກ ໃນແຕ່ລະແຖວ
//  I  = 150,000,000                   ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ (ຊ່ອງລວມທັງໝົດເທົ່ານັ້ນ)
//  J  = H + I                         ລວມທັງໝົດ (ຊ່ອງລວມທັງໝົດເທົ່ານັ້ນ)
import type { TaxMonthlyRaw } from "@/app/api/oracle/CL_tax_monthly/tax_monthly.repo";

export type { TaxMonthlyRaw };
export const DEFAULT_INCOME_TAX = 150_000_000;
export const VAT_RATE = 0.1; // ຄິດຈາກ C ທີ່ລວມ ອມພ ແລ້ວ → ÷1.10
export const EXCISE_RATE = 0.3; // ຄິດຈາກ D ທີ່ລວມ ອກຊ ແລ້ວ → ÷1.30

export interface TaxCol {
  A: number; B: number; C: number; D: number; E: number; F: number; G: number; H: number;
}
export type ColKey = "DOG" | "PUP" | "TOTAL";

/** ROUND ແບບ Excel (ເຄິ່ງ → ອອກຫ່າງຈາກສູນ) */
export const xround = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

export function calcCol(sales: number, paid: number): TaxCol {
  const A = sales;
  const B = paid;
  const C = A - B;
  const E = xround(((C * 100) / 110) * VAT_RATE);
  const D = C - E;
  const G = xround(((D * 100) / 130) * EXCISE_RATE);
  const F = D - G;
  const H = E + G;
  return { A, B, C, D, E, F, G, H };
}

export function calcAll(raw: TaxMonthlyRaw, incomeTax: number) {
  const dog = calcCol(raw.DOG.sales, raw.DOG.paid);
  const pup = calcCol(raw.PUP.sales, raw.PUP.paid);
  // ຊ່ອງລວມທັງໝົດ = ລວມຂອງ 2 ກິດຈະກຳ ທຸກແຖວ (ຕາມຕາຕະລາງຫົວໜ້າ — ບໍ່ຄິດສູດໃໝ່ຈາກຍອດລວມ ເພາະຈະຄາດເຄື່ອນ 1 ກີບຈາກການ ROUND)
  const total = {} as TaxCol;
  (Object.keys(dog) as (keyof TaxCol)[]).forEach((k) => { total[k] = dog[k] + pup[k]; });
  return { DOG: dog, PUP: pup, TOTAL: total, I: incomeTax, J: total.H + incomeTax };
}

export const MONTHS_LO = ["ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ", "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"];
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LO[m - 1]} ${y}`;
};
export const todayLabel = (d = new Date()) =>
  `${String(d.getDate()).padStart(2, "0")} ${MONTHS_LO[d.getMonth()]} ${d.getFullYear()}`;

export interface TaxLine {
  key: keyof TaxCol | "I" | "J";
  no: string; // ເລກລຳດັບ (ຖ້າມີ)
  label: string; // ເນື້ອໃນ (J ໃສ່ເດືອນຕອນສະແດງ)
  bold: boolean; // ແຖວຫົວຂໍ້ສະຫຼຸບ (ຕົວໜາສີນ້ຳເງິນ)
  red: boolean; // ຕົວເລກສີແດງ (ອາກອນ)
  hi: boolean; // ໄຮໄລ້ສີສົ້ມຊ່ອງລວມ
  totalOnly: boolean; // ມີສະເພາະຊ່ອງລວມທັງໝົດ
  formula: string; // ສູດ (ໃຊ້ສະແດງໃນໜ້າເວັບ)
}
export const LINES: TaxLine[] = [
  { key: "A", no: "1", label: "ຍອດຂາຍ", bold: false, red: false, hi: false, totalOnly: false, formula: "ຍອດຂາຍທັງໝົດໃນເດືອນທີ່ເລືອກ" },
  { key: "B", no: "2", label: "ຍອດຈ່າຍເງິນລາງວັນ", bold: false, red: false, hi: false, totalOnly: false, formula: "ຍອດຈ່າຍລາງວັນທັງໝົດໃນເດືອນທີ່ເລືອກ" },
  { key: "C", no: "", label: "ລາຍຮັບຫຼັງ ຫັກລາງວັນ", bold: true, red: false, hi: false, totalOnly: false, formula: "C = A − B" },
  { key: "D", no: "", label: "ລາຍຮັບນອກ ອມພ", bold: true, red: false, hi: true, totalOnly: false, formula: "D = C − E" },
  { key: "E", no: "3", label: "ອາກອນມູນຄ່າເພີ່ມ ອມພ (10%)", bold: false, red: true, hi: false, totalOnly: false, formula: "E = ROUND(C×100/110×10%, 0)" },
  { key: "F", no: "", label: "ລາຍຮັບນອກ ອມພ ແລະ ອກຊ", bold: true, red: false, hi: true, totalOnly: false, formula: "F = D − G" },
  { key: "G", no: "4", label: "ອາກອນຊົມໃຊ້ ອກຊ (30%)", bold: false, red: true, hi: false, totalOnly: false, formula: "G = ROUND(D×100/130×30%, 0)" },
  { key: "H", no: "", label: "ລວມ ອມພ , ອກຊ ຕ້ອງມອບ", bold: true, red: false, hi: false, totalOnly: false, formula: "H = E + G" },
  { key: "I", no: "5", label: "ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ", bold: false, red: true, hi: false, totalOnly: true, formula: "I = 150,000,000" },
  { key: "J", no: "", label: "ລວມ ອມພ , ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ ເດືອນ", bold: true, red: false, hi: false, totalOnly: true, formula: "J = H + I" },
];

export const fmt0 = (n: number) => Math.round(n).toLocaleString("en-US");
