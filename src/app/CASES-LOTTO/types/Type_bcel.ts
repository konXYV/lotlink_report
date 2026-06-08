// src/app/CASES-LOTTO/types/Type_bcel.ts

export type Orders_BCEL = {
  TICKET?: string;
  TOTALSALE?: number;
  USERID?: string;
  EXPIRE_DATE?: string | Date;
  LOTO_BILL_NO?: string;
  LOTTO_STATUS_ID?: string;
  DRAW_ID?: number;
  DRAW_DATE?: string | Date;
  ORDER_DATE?: string | Date;
  ORDER_STATUS?: string;
  PAYMENT_ACC_NO?: string;
  PAYMENT_ACC_CCY?: string;
  PJRRNO?: string;
  NOTE?: string | null;
  SALE_DATE?: string | Date;
  APP?: string;
  POINT_ISSUED?: number;
  POINT_ISSUED_REFERENCE?: string | null;
  POINT_CONSUMED?: number | null;
  POINT_CONSUMED_REFERENCE?: string | null;
};

export type REWARD_BCEL = {
  TXTIME: string | Date;
  DRAW_ID: number;
  DRAW_DATE: string | Date;
  ORDER_DATE: string | Date;
  ORDER_STATUS: string;
  ACCOUNT: string;
  XREF: string;
  PJRRNO: string;
  TICKETID: string;
  PRICE1DIGIT: number;
  PRICE2DIGIT: number;
  PRICE3DIGIT: number;
  PRICE4DIGIT: number;
  PRICE5DIGIT: number;
  PRICE6DIGIT: number;
  REWARD1DIGIT: number;
  REWARD2DIGIT: number;
  REWARD3DIGIT: number;
  REWARD4DIGIT: number;
  REWARD5DIGIT: number;
  REWARD6DIGIT: number;
  TOTALREWARDAMOUNT: number;
  TOTALREWARDAMOUNTAFTERTAX: number;
  TICKETCONFIRMDATE: string | Date;
  TICKETCONFIRMRESULT: number;
  APP: string;
  ADJACENT2: number;
  ADJACENT3: number;
  DOUBLE2: number;
  DOUBLE3: number;
  INVOICE2: number;
  INVOICE3: number;
  TOTALBONUS: number;
  BONUSXREF: string;
  BONUSPJRRNO: string;
  TOTALBONUSOLD: string;
  BONUSADJUSTPJRRNO: string;
  FEE: number;
  ADJACENT4: number;
  ADJACENT5: number;
  ADJACENT6: number;
  STATUS: string;
  FAILCOUNT: number;
  ERRORMESSAGE: string;
};

export interface BCEL_STMT_ENTITY {
  BANK_DATE: string | Date | null;
  BANK_TXN_ID: string | null;
  BANK_DESCRIPTION: string | null;
  BANK_DR: number | null;
  BANK_CR: number | null;
  TXN_TYPE: string | null;
  DRAWID: number | null;
  LOTTO_BILL_NO: string | null;
  REFERENCE_ID: string | null;
  DRAWDATE: string | Date | null;
  STARTDATE: string | Date | null;
  ENDDATE: string | Date | null;
}
