import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetOrderRes } from '@app/models/get-order-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { MonthPaymentRes } from '@app/models/get-month-payments-res';
import { PoolsService } from '@app/services/pages/pools.service';
import { OrganizerSession } from '@app/services/session/organizer-session.service';

@Component({
  selector: 'app-month-payments',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './month-payments.html',
  styleUrl: './month-payments.css'
})
export class MonthPayments implements OnInit {
  private static readonly PERCENT = 100;

  private readonly pools = inject(PoolsService);
  private readonly organizer = inject(OrganizerSession);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly payments = signal<MonthPaymentRes[]>([]);

  private readonly order = signal<GetOrderRes | null>(null);

  protected readonly turns = computed(() => this.order()?.turns ?? []);
  protected readonly currentMonth = computed(() => this.order()?.currentMonth ?? '');

  /** Mes que se está mirando; arranca en el mes en curso. */
  protected readonly selectedMonth = signal('');

  protected readonly loading = signal(true);
  protected readonly confirming = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isOrganizer = computed(() => this.organizer.get(this.poolId()) !== null);

  protected readonly drawn = computed(() => this.turns().length > 0);

  /** Meses que ya han llegado: los únicos con cuotas que cobrar. */
  protected readonly openMonths = computed(() =>
    this.turns().filter((turn) => turn.month <= this.currentMonth())
  );

  /** Quien cobra el mes elegido. */
  protected readonly beneficiary = computed(
    () => this.turns().find((turn) => turn.month === this.selectedMonth()) ?? null
  );

  protected readonly monthlyFee = computed(() => this.pool()?.monthlyFee ?? 0);

  /** Lo que debería juntarse: pagan todos menos quien cobra. */
  protected readonly potTotal = computed(
    () => this.monthlyFee() * Math.max((this.pool()?.numParticipants ?? 0) - 1, 0)
  );

  /** Solo lo confirmado cuenta: el organizador tiene que haber visto el ingreso. */
  protected readonly confirmedCount = computed(
    () => this.payments().filter((payment) => payment.confirmed).length
  );

  protected readonly potCollected = computed(() => this.confirmedCount() * this.monthlyFee());

  protected readonly progress = computed(() => {
    const total = this.potTotal();
    if (total === 0) {
      return 0;
    }

    return Math.round((this.potCollected() / total) * MonthPayments.PERCENT);
  });

  /** Cuántas cuotas quedan por dar por recibidas. */
  protected readonly unresolved = computed(
    () => this.payments().filter((payment) => !payment.confirmed).length
  );

  protected readonly potComplete = computed(
    () => this.payments().length > 0 && this.unresolved() === 0
  );

  ngOnInit(): void {
    if (!this.isOrganizer()) {
      this.loading.set(false);
      return;
    }

    this.load();
  }

  /** Cambia el mes que se está mirando. */
  protected selectMonth(month: string): void {
    this.selectedMonth.set(month);
    this.loadPayments();
  }

  /** Da por recibida la cuota de alguien. */
  protected confirm(participantId: string): void {
    if (this.confirming()) {
      return;
    }

    this.confirming.set(participantId);
    this.errorMessage.set(null);

    this.pools
      .confirmReceived(this.poolId(), {
        participantPublicId: participantId,
        month: this.selectedMonth()
      })
      .subscribe({
      next: (payment) => {
        this.payments.update((all) =>
          all.map((one) =>
            one.participantPublicId === payment.participantPublicId
              ? { ...one, marked: payment.marked, confirmed: payment.confirmed }
              : one
          )
        );
        this.confirming.set(null);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.confirming.set(null);
      }
    });
  }

  /** Convierte un `AAAA-MM-DD` en fecha, para poder darle formato en la vista. */
  protected toDate(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Date(year, monthNumber - 1, 1);
  }

  /** Iniciales con las que se representa a cada participante. */
  protected initials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  /** Carga la porra y, encadenados, participantes, orden y cuotas del mes. */
  private load(): void {
    this.pools.getPool(this.poolId()).subscribe({
      next: (pool) => {
        this.pool.set(pool);
        this.loadRest();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Segunda parte de la carga. */
  private loadRest(): void {
    this.pools.getOrder(this.poolId()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);

        // Se abre por el mes en curso; si la porra ya terminó, por el último.
        const months = this.openMonths();
        if (months.length > 0) {
          this.selectedMonth.set(months[months.length - 1].month);
          this.loadPayments();
        }
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Cuotas del mes elegido. */
  private loadPayments(): void {
    this.pools.getMonthPayments(this.poolId(), this.selectedMonth()).subscribe({
      next: (payments) => this.payments.set(payments),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }
}
