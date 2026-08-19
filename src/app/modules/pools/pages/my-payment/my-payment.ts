import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetOrderRes } from '@app/models/get-order-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { PaymentRes } from '@app/models/payment-res';
import {
  ParticipantIdentity,
  ParticipantSession
} from '@app/services/session/participant-session.service';
import { PoolsService } from '@app/services/pages/pools.service';

@Component({
  selector: 'app-my-payment',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './my-payment.html',
  styleUrl: './my-payment.css'
})
export class MyPayment implements OnInit {
  private readonly pools = inject(PoolsService);
  private readonly session = inject(ParticipantSession);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly participants = signal<ParticipantRes[]>([]);
  protected readonly payments = signal<PaymentRes[]>([]);

  private readonly order = signal<GetOrderRes | null>(null);

  protected readonly turns = computed(() => this.order()?.turns ?? []);
  protected readonly currentMonth = computed(() => this.order()?.currentMonth ?? '');
  protected readonly identity = signal<ParticipantIdentity | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly drawn = computed(() => this.turns().length > 0);

  /** Turno del mes en curso, si la porra está en marcha. */
  protected readonly currentTurn = computed(
    () => this.turns().find((turn) => turn.month === this.currentMonth()) ?? null
  );

  /** Este mes me toca cobrar a mí, así que no pago cuota. */
  protected readonly iCollectThisMonth = computed(
    () => this.currentTurn()?.participantId === this.identity()?.participantId
  );

  /** Mi cuota del mes en curso, si ya la he marcado. */
  protected readonly currentPayment = computed(
    () => this.payments().find((payment) => payment.month === this.currentMonth()) ?? null
  );

  protected readonly alreadyMarked = computed(() => this.currentPayment()?.marked === true);

  /** Turnos que ya han pasado o están en curso: los meses con cuota. */
  protected readonly pastAndCurrentTurns = computed(() =>
    this.turns().filter((turn) => turn.month <= this.currentMonth())
  );

  /** La porra aún no ha llegado a su primer mes. */
  protected readonly notStarted = computed(() => {
    const turns = this.turns();

    return turns.length > 0 && this.currentMonth() < turns[0].month;
  });

  /** Ya han cobrado todos: no queda ninguna cuota por pagar. */
  protected readonly finished = computed(() => {
    const turns = this.turns();

    return turns.length > 0 && this.currentMonth() > turns[turns.length - 1].month;
  });

  ngOnInit(): void {
    this.identity.set(this.session.get(this.poolId()));
    this.load();
  }

  /** Recuerda con qué participante se está usando la porra. */
  protected chooseIdentity(person: ParticipantRes): void {
    const identity: ParticipantIdentity = {
      participantId: person.participantId,
      fullName: person.fullName
    };

    this.session.save(this.poolId(), identity);
    this.identity.set(identity);
    this.loadMyPayments();
  }

  /** El «no soy yo»: vuelve a la lista de nombres. */
  protected forgetIdentity(): void {
    this.session.clear(this.poolId());
    this.identity.set(null);
    this.payments.set([]);
  }

  /** Marca que ya se ha pagado la cuota del mes en curso. */
  protected markPaid(): void {
    const person = this.identity();
    if (!person || this.sending() || this.alreadyMarked()) {
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    this.pools.markPaid(this.poolId(), this.currentMonth(), person.participantId).subscribe({
      next: (payment) => {
        this.payments.update((all) => [
          ...all.filter((one) => one.month !== payment.month),
          payment
        ]);
        this.sending.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.sending.set(false);
      }
    });
  }

  /** Estado de mi cuota en un mes ya pasado. */
  protected paymentStateOf(month: string): 'COLLECTED' | 'CONFIRMED' | 'MARKED' | 'UNPAID' {
    if (
      this.turns().find((turn) => turn.month === month)?.participantId ===
      this.identity()?.participantId
    ) {
      return 'COLLECTED';
    }

    const payment = this.payments().find((one) => one.month === month);
    if (payment?.confirmed) {
      return 'CONFIRMED';
    }

    return payment?.marked ? 'MARKED' : 'UNPAID';
  }

  /** Quién cobra en un mes concreto. */
  protected collectorOf(month: string): string {
    return this.turns().find((turn) => turn.month === month)?.fullName ?? '';
  }

  /** Texto del día límite de pago, a partir del código del alta. */
  protected dueDayLabel(): string {
    switch (this.pool()?.paymentDueDay) {
      case 'DAY_5':
        return 'el día 5 de cada mes';
      case 'DAY_15':
        return 'el día 15 de cada mes';
      case 'LAST_DAY':
        return 'el último día del mes';
      default:
        return 'el día 10 de cada mes';
    }
  }

  /** Convierte un `AAAA-MM` en fecha, para poder darle formato en la vista. */
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

  /** Carga la porra y, encadenados, participantes, orden y mis cuotas. */
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
    this.pools.getParticipants(this.poolId()).subscribe({
      next: (participants) => this.participants.set(participants)
    });

    this.pools.getOrder(this.poolId()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
        this.loadMyPayments();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Mis cuotas, una vez se sabe quién soy. */
  private loadMyPayments(): void {
    const person = this.identity();
    if (!person) {
      return;
    }

    this.pools.getMyPayments(this.poolId(), person.participantId).subscribe({
      next: (payments) => this.payments.set(payments)
    });
  }
}
