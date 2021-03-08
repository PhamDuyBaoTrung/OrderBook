import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {DataService} from './data.service';
import {OkexTable, WsConnectionStatus} from '../model/okex-response';
import {catchError, tap} from 'rxjs/internal/operators';
import {OrderBook} from '../model/order-book';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit{
  orderBook: OrderBook;
  public connectionStatus: WsConnectionStatus;
  // this data used to test
  private testAsks = [
    ['53324.99', '9', '0', '1'],
    ['53341.5', '0', '0', '0'],
    ['53403.87', '289', '0', '1'],
    ['53409.55', '0', '0', '0'],
    ['53411.62', '208', '0', '1'],
    ['53545', '0', '0', '0'],
    ['53547.07', '208', '0', '1'],
    ['53680.44', '0', '0', '0'],
    ['53682.52', '208', '0', '1'],
    ['57995.84', '0', '0', '0'],
    ['53324.99', '0', '0', '0'],
    ['57995.84', '800', '0', '1'],
    ['53345.87', '10', '0', '1'],
    ['57995.84', '0', '0', '0'],
    ['53341.5', '9', '0', '1'],
    ['53345.87', '0', '0', '0'],
    ['53324.99', '9', '0', '1'],
    ['53341.5', '0', '0', '0'],
    ['53324.99', '0', '0', '0'],
    ['53367.22', '10', '0', '1'],
    ['57995.84', '800', '0', '1'],
    ['53341.5', '9', '0', '1'],
    ['57995.84', '0', '0', '0'],
    ['53319.77', '0', '0', '0'],
    ['57995.84', '800', '0', '1'],
    ['53341.5', '0', '0', '0'],
    ['57999.38', '2002', '0', '1'],
    ['53322.94', '9', '0', '1'],
    ['53355.97', '16', '0', '1'],
    ['53375.86', '0', '0', '0'],
    ['57999.38', '0', '0', '0'],
    ['53322.01', '32', '0', '1'],
    ['53345.99', '16', '0', '1'],
    ['53355.97', '0', '0', '0'],
    ['57995.84', '0', '0', '0'],
    ['53322.94', '0', '0', '0']
  ];
  // this data used to test
  private testBids = [
    ['53289.73', '0', '0', '0'],
    ['53036.94', '208', '0', '1'],
    ['53034.88', '0', '0', '0'],
    ['52911.97', '208', '0', '1'],
    ['52909.92', '0', '0', '0'],
    ['49800', '58', '0', '3'],
    ['53282.33', '1', '0', '1'],
    ['49800', '0', '0', '0'],
    ['53282.33', '0', '0', '0'],
    ['49800', '58', '0', '3'],
    ['53293.32', '1', '0', '1'],
    ['49800', '0', '0', '0'],
    ['53293.32', '0', '0', '0'],
    ['49800', '58', '0', '3'],
    ['53286.47', '1', '0', '1'],
    ['53260.67', '20', '0', '2'],
    ['49800', '0', '0', '0'],
    ['53293.76', '1', '0', '1'],
    ['53286.47', '0', '0', '0'],
    ['53260.67', '10', '0', '1'],
    ['53298.81', '0', '0', '0'],
    ['49800', '58', '0', '3'],
    ['53307.09', '0', '0', '0'],
    ['53293.76', '0', '0', '0'],
    ['53280.84', '0', '0', '0'],
    ['53272.01', '180', '0', '1'],
    ['53270.63', '0', '0', '0'],
    ['53244.09', '0', '0', '0'],
    ['49770.63', '25', '0', '1'],
    ['49700', '1', '0', '1'],
    ['49698', '5', '0', '1'],
    ['49697', '5', '0', '1'],
    ['53289.73', '1', '0', '1'],
    ['53272.01', '0', '0', '0'],
    ['53265.72', '181', '0', '1'],
    ['49697', '0', '0', '0'],
    ['53296.58', '32', '0', '1'],
    ['53280.84', '33', '0', '1'],
    ['53237.48', '45', '0', '1'],
    ['49770.63', '0', '0', '0'],
    ['49700', '0', '0', '0'],
    ['49698', '0', '0', '0']
  ];
  constructor(private service: DataService) {
    this.service.getConnectionStatus().subscribe((res) => {
      this.connectionStatus = res;
      if (this.connectionStatus === WsConnectionStatus.OK && this.service.isSocketReady()) {
        this.service.sendMessage({
          op: 'subscribe',
          args: [
            'futures/depth_l2_tbt:BTC-USD-210625',
            'futures/mark_price:BTC-USD-210625',
            'futures/ticker:BTC-USD-210625'
          ]
        });
      }
    });
  }

  ngOnInit() {
    this.service.messages$.pipe(
      catchError(error => { throw error; }),
      tap({
        error: error => console.log('Error:', error),
        complete: () => console.log('Connection Closed')
      })
    ).subscribe((res: OrderBook) => {
      if (res) {
        this.orderBook = Object.assign({}, this.orderBook, res);
      }
    });
  }

  ngOnDestroy() {
    this.service.close();
  }

  ngAfterViewInit() {
    this.service.connect();

  }

  get isConnected() {
    return this.connectionStatus === WsConnectionStatus.OK;
  }

  get isReConnecting() {
    return this.connectionStatus === WsConnectionStatus.RECONNECT;
  }

  get isDisconnected() {
    return this.connectionStatus === WsConnectionStatus.FAILED;
  }

  next() {
    const endIdx = Math.floor(Math.random() * 10);
    const startIdx = Math.floor(Math.random() * endIdx);
    const nextMsg = {
      table: OkexTable.FUTURES_DEPTH_L2_TBT,
      data: [
        {
          asks: this.testAsks.slice(startIdx, endIdx),
          bids: this.testBids.slice(startIdx, endIdx)
        }
      ]
    };
    const nextOrder = this.service.testData(nextMsg);
    this.orderBook = Object.assign({}, this.orderBook, nextOrder);
  }
}
