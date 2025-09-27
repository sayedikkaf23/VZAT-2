import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({
  name: 'dateFormat',
    standalone: true 
})
export class DateFormatPipe implements PipeTransform {
  transform(
    value: string | Date,
    format: string = 'DD-MM-YYYY HH:mm A'
  ): string {
    if (!value) return ''; // If the value is null or undefined, return an empty string

    return moment(value).format(format);
  }
}
