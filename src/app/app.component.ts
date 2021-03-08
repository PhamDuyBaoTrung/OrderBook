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
}
