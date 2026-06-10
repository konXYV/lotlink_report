export interface ORDER_LDB_ENTITY {
  TICKET: string;
  TXTIME: string | Date;
  USERID: string;
  AMOUNT: number;
  BILLNUMBER: string;
  DRAWID: number | string;
  STATUS: string;
  ACCOUNT: string;
  JOURNAL: string;
  PAYBY: string;
  POINTISSUEAMOUNT: number;
  POINTISSUEREFERENCE: string;
  AMOUNTAFTERDISCOUNT: number;
}

export interface REWARD_LDB_ENTITY {
  TXTIME?: string | Date | null;
  DRAWID?: string | number | null;
  XREF?: string;
  TICKET?: string | null;
  BILLNUMBER?: string | null;

  PRICE1DIGIT?: number | null;
  PRICE2DIGIT?: number | null;
  PRICE3DIGIT?: number | null;
  PRICE4DIGIT?: number | null;
  PRICE5DIGIT?: number | null;
  PRICE6DIGIT?: number | null;

  REWARD1DIGIT?: number | null;
  REWARD2DIGIT?: number | null;
  REWARD3DIGIT?: number | null;
  REWARD4DIGIT?: number | null;
  REWARD5DIGIT?: number | null;
  REWARD6DIGIT?: number | null;

  TOTALREWARDAMOUNT?: number | null;
  TOTALREWARDAMOUNTAFTERTAX?: number | null;
  PAYBY?: string | null;
  STATUS?: string | null;

  ADJACENT2?: number | null;
  ADJACENT3?: number | null;
  ADJACENT4?: number | null;
  ADJACENT5?: number | null;
  ADJACENT6?: number | null;

  DOUBLE2?: number | null;
  DOUBLE3?: number | null;

  INVOICE2?: number | null;
  INVOICE3?: number | null;

  TOTALBONUS?: number | null;
  TOTALBONUSOLD?: number | null;
}

export interface STMT_LDB_ENTITY {
  DATE_TIME?: string | Date | null;
  LDB_REF?: string | null;
  BANK_DETAIL?: string | null;
  WITHDRAW?: number | null;
  DEPOSIT?: number | null;
  TXN_TYPE?: string | null;
  DRAWID?: number | string | null;
  BILLNUMBER?: string | null;
}
