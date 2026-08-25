import { Component, input } from '@angular/core';

import { MonthDatePipe } from '@app/shared/pipes/month-date.pipe';

@Component({
  selector: 'app-how-it-works',
  imports: [MonthDatePipe],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css'
})
export class HowItWorks {
  readonly numParticipants = input.required<number>();

  /** Mes de inicio, en formato ISO `AAAA-MM-DD`. */
  readonly startDate = input.required<string>();
}
