export interface ORDER_SPIN_ENTITY {
  TXTIME: string;
  USERID: string;
  DRAWID: string;
  SPINRESULT: string;
  WINAMOUNT: number;
  WINXREF: string;
  WINJOURNAL: string;
  WINCHANNEL: string;
  WINACCOUNT: string;
  CORERESULT: string;
}

export interface STMT_SPIN_ENTITY {
  BANK_NAME: string;
  BANK_DATE: string;
  BANK_TXN_ID: string;
  BANK_DETAIL: string;
  WITHDRAW: number;
  DEPOSIT: number;
  TXN_TYPE: string;
  DRAWID: string;
  BILLNUMBER: string;
  XREF: string;
}
