// src/app/api/oracle/CL_prize_match/prize_match.repo.ts
// ─── ກະທົບຍ່ອຍ (ລະດັບໃບບິນ) : ລາຍການຖືກລາງວັນໃນລະບົບ CL  ທຽບ  ການຈ່າຍລາງວັນໃນ Statement ────────────
//  ຝັ່ງລະບົບ : CL_LOTTO_REWARD  (BILLNUMBER, WINAMOUNT, CLIENTREFNO)
//  ຝັ່ງທະນາຄານ: CL_BCEL_STMT    (BANK_ACCT = 0101300016635, LOTTO_BILL_NO, REFERENCE_ID, BANK_DR)
//  ກິດຈະກຳ (ແຍກ) ຈາກ 2 ຕົວທຳອິດຂອງ DRAWID: 11 = ນ້ອງໝານຳໂຊກ (DOG) · 36 = ປູປາເຕົ້າມະຫາໂຊກ (PUP)
//
//  ກົດການຈັບຄູ່ (key):
//   1) TRIM(BILLNUMBER)  =  TRIM(LOTTO_BILL_NO)
//   2) ຖ້າ Statement ບໍ່ມີ LOTTO_BILL_NO → ໃຊ້ TRIM(REFERENCE_ID) = TRIM(CLIENTREFNO) ຫາ BILLNUMBER ຂອງລະບົບ
//  FEE / TAX ຂອງ Statement (1 ບິນ = ລາງວັນ + FEE + TAX) ສະແດງຂໍ້ມູນເທົ່ານັ້ນ — ບໍ່ມີຝັ່ງລະບົບ ຈຶ່ງບໍ່ຖືກນຳໄປຕັດສິນສະຖານະ
//  ຂອບເຂດຝັ່ງລະບົບ: ຜູ້ຂາຍ APP ທຸກບິນ — ບໍ່ກັ່ນ USEPOINTFLAG (ບິນທີ່ຊື້ດ້ວຍຄະແນນ ກໍຍັງຈ່າຍລາງວັນເປັນເງິນຜ່ານ Statement)
//  ງວດ = ງວດໃນ CL_LOTTO_REWARD ທີ່ DRAWDATE ຢູ່ໃນຊ່ວງ → ຊອກຈ່າຍອອກຂອງງວດເຫຼົ່ານັ້ນໃນ Statement ບໍ່ຈຳກັດວັນທະນາຄານ
//  ບໍ່ແຕະ/ບໍ່ແກ້ ໄຟລ໌ repo ອື່ນ — ໃຊ້ pool ຂອງ CL ຮ່ວມກັນເທົ່ານັ້ນ (read-only SELECT).
import { withClConnection } from "../CL/cl.connection";

export const ACCT_PRIZE_OUT = "0101300016635";
export const APP_USERNAME = "0101001APP";
export const PAY_TXN_TYPES = ["Dog racing prize", "Pupatao prize"] as const;
// FEE (BANK_DR) ແລະ TAX (BANK_CR) ຂອງບິນດຽວກັນ ຢູ່ບັນຊີດຽວກັນ — ສະແດງເປັນຂໍ້ມູນ
export const FEE_TXN_TYPES = ["FEE_Dog racing prize", "FEE_Pupatao prize"] as const;
export const TAX_TXN_TYPES = ["TAX Dog racing prize", "TAX Pupatao prize"] as const;

export type MatchStatus = "MATCH" | "DIFF" | "NOT_PAID" | "NOT_IN_SYSTEM";
export type MatchSvc = "DOG" | "PUP" | "OTHER";

export interface PrizeMatchRow {
  SVC: MatchSvc;
  DRAWID: string;
  DRAWDATE: string; // YYYY-MM-DD (ຈາກລະບົບ) ຫວ່າງຖ້າມີແຕ່ Statement
  BILL: string;
  CLIENTREF: string;
  SYS_CNT: number;
  SYS_AMT: number; // ຍອດຖືກລາງວັນໃນລະບົບ
  BANK_CNT: number;
  BANK_AMT: number; // ຈ່າຍອອກຈາກບັນຊີ (BANK_DR)
  POINT: boolean; // USEPOINTFLAG = 1 (ຊື້ດ້ວຍຄະແນນ) — ສະແດງຂໍ້ມູນ ບໍ່ກະທົບການຈັບຄູ່
  FEE_CNT: number;
  FEE_AMT: number; // ຄ່າທຳນຽມຈ່າຍລາງວັນ (BANK_DR)
  TAX_CNT: number;
  TAX_AMT: number; // ອາກອນຫັກຈາກຜູ້ຖືກລາງວັນເຂົ້າບັນຊີ (BANK_CR)
  BANK_DATE: string; // ວັນທີ່ຈ່າຍ (ຄັ້ງທຳອິດ)
  TXN_TYPE: string;
  DIFF: number; // SYS_AMT − BANK_AMT
  STATUS: MatchStatus;
}

export interface PrizeMatchResult {
  rows: PrizeMatchRow[];
  excluded: { OTHER_USER: number }; // ຍອດຖືກລາງວັນຂອງຜູ້ຂາຍອື່ນທີ່ບໍ່ແມ່ນ APP — ບໍ່ຢູ່ໃນການກະທົບ
}

const OPT = { outFormat: 4002, fetchArraySize: 1000 };
const q = (a: readonly string[]) => a.map((t) => `'${t}'`).join(",");
const ALL_TYPES_SQL = q([...PAY_TXN_TYPES, ...FEE_TXN_TYPES, ...TAX_TXN_TYPES]);
const SVC_PREFIX = `('11','36')`;
const rng = (col: string) =>
  `${col} >= TO_DATE(:dateFrom,'YYYY-MM-DD') AND ${col} < TO_DATE(:dateTo,'YYYY-MM-DD')`;

function rangeBinds(dateFrom: string, dateTo: string) {
  const to = new Date(dateTo);
  to.setDate(to.getDate() + 1); // dateTo ເປັນວັນທີ່ລວມ (inclusive)
  return { dateFrom, dateTo: to.toISOString().slice(0, 10) };
}

const svcOf = (id: string): MatchSvc =>
  id.startsWith("11") ? "DOG" : id.startsWith("36") ? "PUP" : "OTHER";

// ໝາຍເຫດ: ແຍກເປັນ query ງ່າຍໆ (ບໍ່ມີ FULL OUTER JOIN / OR + subquery) ແລ້ວຈັບຄູ່ໃນ Node
// ເພາະ SQL ທີ່ຊັບຊ້ອນເຄີຍເຮັດໃຫ້ Oracle ຂຶ້ນ ORA-00600 [kkqcscpopnWithMap]
const IDS_CTE = `
  ids AS (
    SELECT TO_CHAR(DRAWID) AS DRAWID FROM CL_LOTTO_REWARD
     WHERE ${rng("DRAWDATE")} AND SUBSTR(TO_CHAR(DRAWID),1,2) IN ${SVC_PREFIX}
     GROUP BY TO_CHAR(DRAWID)
  )`;

interface BankAgg {
  DRAWID: string;
  BD: string;
  TT: string;
  payCnt: number;
  payAmt: number;
  feeCnt: number;
  feeAmt: number;
  taxCnt: number;
  taxAmt: number;
}

export async function getClPrizeMatch(dateFrom: string, dateTo: string): Promise<PrizeMatchResult> {
  const rb = rangeBinds(dateFrom, dateTo);

  const sqlSys = `
    WITH ${IDS_CTE}
    SELECT TO_CHAR(DRAWID) AS DRAWID, TRIM(BILLNUMBER) AS BILL, MAX(TRIM(CLIENTREFNO)) AS CREF,
           TO_CHAR(MIN(TRUNC(DRAWDATE)),'YYYY-MM-DD') AS DD,
           COUNT(*) AS CNT, SUM(NVL(WINAMOUNT,0)) AS AMT, MAX(NVL(USEPOINTFLAG,0)) AS PT
      FROM CL_LOTTO_REWARD
     WHERE TO_CHAR(DRAWID) IN (SELECT DRAWID FROM ids)
       AND TRIM(UPPER(USERNAME)) = :appUser
     GROUP BY TO_CHAR(DRAWID), TRIM(BILLNUMBER)`;

  // ຝັ່ງ Statement ຂອງງວດເຫຼົ່ານັ້ນ (ບໍ່ຈຳກັດວັນທະນາຄານ)
  const sqlBankByDraw = `
    WITH ${IDS_CTE}
    SELECT TRIM(DRAWID) AS DRAWID, TRIM(LOTTO_BILL_NO) AS BILL, TRIM(REFERENCE_ID) AS REF, TXN_TYPE,
           TO_CHAR(MIN(TRUNC(BANK_DATE)),'YYYY-MM-DD') AS BD,
           COUNT(*) AS CNT, SUM(NVL(BANK_DR,0)) AS DR, SUM(NVL(BANK_CR,0)) AS CR
      FROM CL_BCEL_STMT
     WHERE BANK_ACCT = :acctOut AND TXN_TYPE IN (${ALL_TYPES_SQL})
       AND TRIM(DRAWID) IN (SELECT DRAWID FROM ids)
     GROUP BY TRIM(DRAWID), TRIM(LOTTO_BILL_NO), TRIM(REFERENCE_ID), TXN_TYPE`;

  // ຈ່າຍອອກທີ່ບໍ່ຜູກກັບງວດ (DRAWID ຫວ່າງ/ບໍ່ແມ່ນ 11,36) ໃນຊ່ວງວັນທີທະນາຄານ
  const sqlBankNoDraw = `
    SELECT TRIM(DRAWID) AS DRAWID, TRIM(LOTTO_BILL_NO) AS BILL, TRIM(REFERENCE_ID) AS REF, TXN_TYPE,
           TO_CHAR(MIN(TRUNC(BANK_DATE)),'YYYY-MM-DD') AS BD,
           COUNT(*) AS CNT, SUM(NVL(BANK_DR,0)) AS DR, SUM(NVL(BANK_CR,0)) AS CR
      FROM CL_BCEL_STMT
     WHERE BANK_ACCT = :acctOut AND TXN_TYPE IN (${ALL_TYPES_SQL})
       AND ${rng("BANK_DATE")}
       AND NVL(SUBSTR(TRIM(DRAWID),1,2),'--') NOT IN ${SVC_PREFIX}
     GROUP BY TRIM(DRAWID), TRIM(LOTTO_BILL_NO), TRIM(REFERENCE_ID), TXN_TYPE`;

  // ຍອດຖືກລາງວັນທີ່ບໍ່ຜ່ານບັນຊີ — ສະແດງເປັນຂໍ້ມູນປະກອບ ບໍ່ລວມໃນການກະທົບ
  const sqlExcluded = `
    WITH ${IDS_CTE}
    SELECT NVL(SUM(CASE WHEN TRIM(UPPER(USERNAME)) <> :appUser THEN NVL(WINAMOUNT,0) ELSE 0 END),0) AS OTH
      FROM CL_LOTTO_REWARD
     WHERE TO_CHAR(DRAWID) IN (SELECT DRAWID FROM ids)`;

  return withClConnection(async (conn) => {
    // ເຮັດຕາມລຳດັບ (ບໍ່ Promise.all) ເພື່ອລຸດການໃຊ້ connection ພ້ອມກັນ
    const sysRes = await conn.execute(sqlSys, { ...rb, appUser: APP_USERNAME }, OPT);
    const bankRes = await conn.execute(sqlBankByDraw, { ...rb, acctOut: ACCT_PRIZE_OUT }, OPT);
    const bankNoDrawRes = await conn.execute(sqlBankNoDraw, { ...rb, acctOut: ACCT_PRIZE_OUT }, OPT);
    const exRes = await conn.execute(sqlExcluded, { ...rb, appUser: APP_USERNAME }, OPT);

    // ── ຝັ່ງລະບົບ ──
    interface SysAgg { DRAWID: string; DD: string; CREF: string; CNT: number; AMT: number; PT: boolean }
    const sysMap = new Map<string, SysAgg>();
    const crefToBill = new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (sysRes.rows as any[]) ?? []) {
      const bill = String(r.BILL ?? "");
      const prev = sysMap.get(bill);
      const cnt = Number(r.CNT ?? 0);
      const amt = Number(r.AMT ?? 0);
      if (prev) {
        prev.CNT += cnt;
        prev.AMT += amt;
        if (Number(r.PT ?? 0) === 1) prev.PT = true;
      } else {
        sysMap.set(bill, { DRAWID: String(r.DRAWID ?? ""), DD: String(r.DD ?? ""), CREF: String(r.CREF ?? ""), CNT: cnt, AMT: amt, PT: Number(r.PT ?? 0) === 1 });
      }
      if (r.CREF) crefToBill.set(String(r.CREF), bill);
    }

    // ── ຝັ່ງ Statement: ລວມ ລາງວັນ / FEE / TAX ຕໍ່ບິນ ──
    const bankMap = new Map<string, BankAgg>();
    const isPay = (t: string) => (PAY_TXN_TYPES as readonly string[]).includes(t);
    const isFee = (t: string) => (FEE_TXN_TYPES as readonly string[]).includes(t);
    const isTax = (t: string) => (TAX_TXN_TYPES as readonly string[]).includes(t);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bankRows: any[] = [...((bankRes.rows as any[]) ?? []), ...((bankNoDrawRes.rows as any[]) ?? [])];
    for (const r of bankRows) {
      const ref = String(r.REF ?? "");
      const key = r.BILL ? String(r.BILL) : (ref && crefToBill.get(ref)) || `REF:${ref || "-"}`;
      const tt = String(r.TXN_TYPE ?? "");
      let b = bankMap.get(key);
      if (!b) {
        b = { DRAWID: String(r.DRAWID ?? ""), BD: String(r.BD ?? ""), TT: "", payCnt: 0, payAmt: 0, feeCnt: 0, feeAmt: 0, taxCnt: 0, taxAmt: 0 };
        bankMap.set(key, b);
      }
      if (!b.DRAWID && r.DRAWID) b.DRAWID = String(r.DRAWID);
      if (r.BD && (!b.BD || String(r.BD) < b.BD)) b.BD = String(r.BD);
      const cnt = Number(r.CNT ?? 0);
      if (isPay(tt)) { b.payCnt += cnt; b.payAmt += Number(r.DR ?? 0); b.TT = tt; }
      else if (isFee(tt)) { b.feeCnt += cnt; b.feeAmt += Number(r.DR ?? 0); }
      else if (isTax(tt)) { b.taxCnt += cnt; b.taxAmt += Number(r.CR ?? 0); }
    }

    // ── ຈັບຄູ່ (full outer join ໃນ Node) ──
    const keys = new Set<string>([...sysMap.keys(), ...bankMap.keys()]);
    const rows: PrizeMatchRow[] = [];
    for (const bill of keys) {
      const sy = sysMap.get(bill);
      const bk = bankMap.get(bill);
      const sysCnt = sy?.CNT ?? 0;
      const sysAmt = sy?.AMT ?? 0;
      const bankCnt = bk?.payCnt ?? 0;
      const bankAmt = bk?.payAmt ?? 0;
      const feeCnt = bk?.feeCnt ?? 0;
      const taxCnt = bk?.taxCnt ?? 0;
      const diff = Math.round((sysAmt - bankAmt) * 100) / 100;
      const hasBank = bankCnt > 0 || feeCnt > 0 || taxCnt > 0;
      const status: MatchStatus =
        sysCnt > 0 && bankCnt === 0
          ? "NOT_PAID"
          : sysCnt === 0 && hasBank
            ? "NOT_IN_SYSTEM"
            : Math.abs(diff) >= 0.5
              ? "DIFF"
              : "MATCH";
      const drawId = sy?.DRAWID || bk?.DRAWID || "";
      rows.push({
        SVC: svcOf(drawId),
        DRAWID: drawId,
        DRAWDATE: sy?.DD ?? "",
        BILL: bill,
        CLIENTREF: sy?.CREF ?? "",
        POINT: sy?.PT ?? false,
        SYS_CNT: sysCnt,
        SYS_AMT: sysAmt,
        BANK_CNT: bankCnt,
        BANK_AMT: bankAmt,
        FEE_CNT: feeCnt,
        FEE_AMT: bk?.feeAmt ?? 0,
        TAX_CNT: taxCnt,
        TAX_AMT: bk?.taxAmt ?? 0,
        BANK_DATE: bk?.BD ?? "",
        TXN_TYPE: bk?.TT ?? "",
        DIFF: diff,
        STATUS: status,
      });
    }
    rows.sort((x, y) => x.DRAWID.localeCompare(y.DRAWID) || x.BILL.localeCompare(y.BILL));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ex = ((exRes.rows as any[]) ?? [])[0] ?? {};
    return { rows, excluded: { OTHER_USER: Number(ex.OTH ?? 0) } };
  });
}
