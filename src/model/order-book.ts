export class OrderBook {
  sell: OrderBookItem[];
  buy: OrderBookItem[];
  lastTradedPrice: number;
  markPrice: number;
  totalQuantity: number;
  lastPriceStatus: PriceStatus;
}

export class OrderBookItem {
  price: number;
  quantity: number;
  total: number;
  constructor(price: number, quantity: number) {
    this.price = price;
    this.quantity = quantity;
  }
}

export enum PriceStatus {
  UP = 1,
  DOWN = 2
}
