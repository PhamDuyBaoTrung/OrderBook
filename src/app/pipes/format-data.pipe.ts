import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'orderValue'
})
export class FormatedDataPipe implements PipeTransform {
  transform(value: any) {
    if (!value || value === '') {
      return '-';
    } else {
      return value;
    }
  }
}
