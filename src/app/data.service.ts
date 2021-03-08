import {Injectable} from '@angular/core';
import {webSocket} from 'rxjs/webSocket';
import {EMPTY, Observable, Subject, timer} from 'rxjs';
import {catchError, delayWhen, retryWhen, switchAll, tap} from 'rxjs/operators';
import pako from 'pako';
import {OrderBook, OrderBookItem, PriceStatus} from '../model/order-book';
import {OkexResponse, OkexTable, WsConnectionStatus} from '../model/okex-response';
import {throttleTime} from 'rxjs/internal/operators';
import {AppSetting} from './utils/app-setting';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  static readonly MAX_ORDER_ITEM = 6;
  static readonly MAX_CONNECTION_RETRY = 5;
  private socket$;
  private depth = 0.5;
  private orderBook: OrderBook = new OrderBook();
  private messagesSubject$ = new Subject();
  private wsConnectionSuject$ = new Subject<WsConnectionStatus>();
  private pingInterval;
  private numOfRetry = 0;
  public messages$ = this.messagesSubject$.pipe(throttleTime(500), switchAll(), catchError(e => { throw e; }));

  public connect(cfg: { reconnect: boolean } = { reconnect: false }): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();
      const messages = this.socket$.pipe(cfg.reconnect ? this.reconnect.bind(this) : o => o,
        throttleTime(500),
        tap({
          error: error => console.log(error),
        }), catchError(_ => EMPTY));
      this.messagesSubject$.next(messages);
    }
  }

  /**
   * Retry a given observable by a time span
   * @param observable the observable to be retried
   */
  private reconnect(observable: Observable<any>): Observable<any> {
    this.wsConnectionSuject$.next(WsConnectionStatus.RECONNECT);
    return observable.pipe(retryWhen(errors => errors.pipe(tap(val => {
        console.log('Retry to connect...');
        this.numOfRetry++;
      }),
      delayWhen(_ => timer(2000)))));
  }

  /**
   * Return a custom WebSocket subject which reconnects after failure
   */
  private getNewWebSocket() {
    return webSocket({
      url: AppSetting.wsEndpoint(),
      deserializer: (e: MessageEvent) => {
        if (e.data === 'pong') {
          return;
        }
        const data = pako.inflateRaw(e.data as any, { to: 'string' });
        const normalizedData = this.normalizeOrderData(JSON.parse(data));
        return normalizedData;
      },
      openObserver: {
        next: () => {
          this.wsConnectionSuject$.next(WsConnectionStatus.OK);
          this.initTimer();
          this.numOfRetry = 0;
        }
      },
      closeObserver: {
        next: () => {
          this.clearTimer();
          this.socket$ = undefined;
          if (this.numOfRetry < DataService.MAX_CONNECTION_RETRY) {
            this.connect({ reconnect: true });
          } else {
            this.wsConnectionSuject$.next(WsConnectionStatus.FAILED);
          }
        }
      },
      binaryType: 'arraybuffer'
    });
  }

  /**
   * send a message to websocket
   * @param msg
   */
  sendMessage(msg: any) {
    this.socket$.next(msg);
  }

  close() {
    this.socket$.complete();
  }

  isSocketReady() {
    return this.socket$ && !this.socket$.closed;
  }

  /**
   * Send a ping request on every 5s to test the connection
   */
  private initTimer() {
    this.pingInterval = setInterval(() => {
      if (this.socket$) {
        this.sendMessage('ping');
      }
    }, 5000);
  }

  private clearTimer() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private normalizeOrderData(rawData: OkexResponse) {
    if (!rawData || !rawData.table) {
      return;
    }
    switch (rawData.table) {
      case OkexTable.FUTURES_DEPTH_L2_TBT:
        return this.normalizeDepthData(rawData.data[0].asks, rawData.data[0].bids);
      case OkexTable.FUTURES_MARK_PRICE:
        return this.extractMarkPrice(rawData.data[0]);
      case OkexTable.FUTURES_TICKER:
        return this.extractLastTradePrice(rawData.data[0]);
      default:
        throw new Error(`Not support furtures type: ${rawData.table}`);
    }
  }

  /**
   * extract and format the mark price from websocket API response
   * @param rawData
   * @returns {OrderBook}
   */
  private extractMarkPrice(rawData) {
    if (!rawData) {
      return this.orderBook;
    }
    const markPrice = Number(rawData.mark_price);
    this.orderBook.markPrice = this.roundedPrice(markPrice, this.depth);
    return this.orderBook;
  }

  /**
   * extract and format the last traded price from websocket API response
   * @param rawData
   * @returns {OrderBook}
   */
  private extractLastTradePrice(rawData) {
    if (!rawData) {
      return this.orderBook;
    }
    const lastTradedPrice = Number(rawData.last);
    this.orderBook.lastPriceStatus = lastTradedPrice > this.orderBook.lastTradedPrice ? PriceStatus.UP : PriceStatus.DOWN;
    this.orderBook.lastTradedPrice = this.roundedPrice(lastTradedPrice, this.depth);
    return this.orderBook;
  }

  public testData(data) {
    return this.normalizeOrderData(data);
  }

  /**
   * normalize the in-depth data from websocket API and aggregate this data based on the selected depth
   * @param {any[]} asks
   * @param {any[]} bids
   * @returns {OrderBook}
   */
  private normalizeDepthData(asks: any[], bids: any[]) {
    let sellPrices = asks.map(o => new OrderBookItem(Number(o[0]), Number(o[1])));
    let buyPrices = bids.map(o => new OrderBookItem(Number(o[0]), Number(o[1])));
    if (sellPrices.length > 0) {
      const ascCompareFn = (p1, p2) => p1.price < p2.price ? -1 : p1.price > p2.price ? 1 : 0;
      const minSellPrice = this.roundedPrice(sellPrices[0].price, this.depth);
      const combinedSellPrices = this.mergeOrderLists(this.orderBook.sell, sellPrices, ascCompareFn);
      const aggregatedSellPrices = this.aggregateSellOrderByDepth(combinedSellPrices, this.depth, minSellPrice);
      aggregatedSellPrices.sort(ascCompareFn);
      this.calculateAccumulate(aggregatedSellPrices);
      sellPrices = aggregatedSellPrices;
    } else {
      sellPrices = (this.orderBook.sell || []).reverse();
    }

    if (buyPrices.length > 0) {
      const descCompareFn = (p1, p2) => p1.price < p2.price ? 1 : p1.price > p2.price ? -1 : 0;
      const maxBuyPrice = this.roundedPrice(buyPrices[0].price, this.depth);
      const combinedBuyPrices = this.mergeOrderLists(this.orderBook.buy, buyPrices, descCompareFn);
      const aggregatedBuyPrices = this.aggregateBuyOrderByDepth(combinedBuyPrices, this.depth, maxBuyPrice);
      aggregatedBuyPrices.sort(descCompareFn);
      this.calculateAccumulate(aggregatedBuyPrices);
      buyPrices = aggregatedBuyPrices;
    } else {
      buyPrices = this.orderBook.buy;
    }
    const totalQuantity = this.getTotalSellQuantity(sellPrices) + this.getTotalBuyQuantity(buyPrices)
    const sellOrders = sellPrices.slice(0, DataService.MAX_ORDER_ITEM);
    const buyOrders = buyPrices.slice(0, DataService.MAX_ORDER_ITEM);
    this.orderBook.sell = sellOrders.reverse();
    this.orderBook.buy = buyOrders;
    this.orderBook.totalQuantity = totalQuantity;
    return this.orderBook;
  }

  private printOutPrice(orders) {
    orders.forEach(o => console.log(o));
  }

  private mergeOrderLists(source: OrderBookItem[], dest: OrderBookItem[], compareFn) {
    const mergedList = source || [];
    mergedList.push(...dest);
    mergedList.sort((o1, o2) => compareFn(o1, o2));
    return mergedList;
  }

  private getTotalSellQuantity(sellOrders: OrderBookItem[]) {
    return sellOrders.length > 0 ? sellOrders[sellOrders.length - 1].total : 0;
  }

  private getTotalBuyQuantity(buyOrders: OrderBookItem[]) {
    return buyOrders.length > 0 ? buyOrders[buyOrders.length - 1].total : 0;
  }

  private roundedPrice(price: number, depth: number) {
    if (depth === 0.5) {
      return Math.round(price * 2) / 2;
    } else {
      return Math.round(price);
    }
  }

  /**
   * aggregate the sell order list based on a specific depth
   * @param {OrderBookItem[]} orders
   * @param {number} depth
   * @param {number} minPrice
   * @returns {OrderBookItem[]}
   */
  private aggregateSellOrderByDepth(orders: OrderBookItem[], depth: number, minPrice: number) {
    const groupOrder = {};
    orders.forEach((x) => {
      const y = this.groupSellKey(x, depth, minPrice);
      groupOrder[y] = (groupOrder[y] || []).concat(x);
    });
    return Object.keys(groupOrder).map((y) => {
      const totalQuantity = groupOrder[y].reduce((t, v) => t + v.quantity, 0);
      return new OrderBookItem(Number(y), totalQuantity);
    });
  }

  private groupSellKey(order: OrderBookItem, depth: number, minPrice: number) {
    const gaps = (order.price - minPrice) / depth;
    return Math.round(gaps) * depth + minPrice;
  }

  /**
   * aggregate the buy order list based on a specific depth
   * @param {OrderBookItem[]} orders
   * @param {number} depth
   * @param {number} minPrice
   * @returns {OrderBookItem[]}
   */
  private aggregateBuyOrderByDepth(orders: OrderBookItem[], depth: number, minPrice: number) {
    const groupOrder = {};
    orders.forEach((x) => {
      const y = this.groupBuyKey(x, depth, minPrice);
      groupOrder[y] = (groupOrder[y] || []).concat(x);
    });
    return Object.keys(groupOrder).map((y) => {
      const totalQuantity = groupOrder[y].reduce((t, v) => t + v.quantity, 0);
      return new OrderBookItem(Number(y), totalQuantity);
    });
  }

  private groupBuyKey(order: OrderBookItem, depth: number, maxPrice: number) {
    const gaps = (maxPrice - order.price) / depth;
    return maxPrice - Math.round(gaps) * depth;
  }

  private calculateAccumulate(orders: OrderBookItem[]) {
    for (let i = 0; i < orders.length; i++) {
      if (i === 0) {
        orders[i].total = orders[i].quantity;
      } else {
        orders[i].total = orders[i].quantity + orders[i - 1].total;
      }
    }
  }

  public setDepth(depth) {
    this.depth = depth;
  }

  public getConnectionStatus() {
    return this.wsConnectionSuject$.asObservable();
  }
}
