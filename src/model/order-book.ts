export class OrderBook {
  sell: OrderBookItem[];
  buy: OrderBookItem[];
  lastTradedPrice: number;
  markPrice: number;
  totalQuantity: number;
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
