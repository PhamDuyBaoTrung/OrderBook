import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {DataService} from '../data.service';
import {OrderBook} from '../../model/order-book';

@Component({
  selector: 'app-instrument-lighting',
  templateUrl: './instrument-lighting.component.html',
  styleUrls: ['./instrument-lighting.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstrumentLightingComponent {
  @Input() orderBook: OrderBook;
  depth = 0.5;

  constructor(private service: DataService) {
  }

  calculateProgress(value) {
    if (!value) {
      return 0;
    }
    return (value / this.orderBook.totalQuantity) * 100;
  }

  onChangeDepth() {
    this.service.setDepth(Number(this.depth));
  }

}
