export class OkexResponse {
  table: OkexTable;
  action?: string;
  data: any[];
}

export enum OkexTable {
  FUTURES_DEPTH_L2_TBT = 'futures/depth_l2_tbt',
  FUTURES_MARK_PRICE = 'futures/mark_price',
  FUTURES_TICKER = 'futures/ticker'
}

export enum WsConnectionStatus {
  OK = 'ok',
  RECONNECT = 'reconnect',
  FAILED = 'failed'
}
