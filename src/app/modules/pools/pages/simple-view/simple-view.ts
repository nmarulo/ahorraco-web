import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetPoolRes } from '@app/models/get-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { PaymentRes } from '@app/models/payment-res';
import { TurnRes } from '@app/models/turn-res';
import { BodyShellService } from '@app/services/layout/body-shell.service';
import { PoolsService } from '@app/services/pages/pools.service';
import {
  ParticipantIdentity,
  ParticipantSession
} from '@app/services/session/participant-session.service';

@Component({
  selector: 'app-simple-view',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './simple-view.html',
  styleUrl: './simple-view.css'
})
export class SimpleView implements OnInit {
  private readonly pools = inject(PoolsService);
  private readonly session = inject(ParticipantSession);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly participants = signal<ParticipantRes[]>([]);
  protected readonly turns = signal<TurnRes[]>([]);
  protected readonly payments = signal<PaymentRes[]>([]);
  protected readonly currentMonth = signal('');
  protected readonly identity = signal<ParticipantIdentity | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly drawn = computed(() => this.turns().length > 0);

  /** Quién cobra este mes. */
  protected readonly currentTurn = computed(
    () => this.turns().find((turn) => turn.month === this.currentMonth()) ?? null
  );

  /** Mi turno: en qué mes cobro y qué número soy. */
  protected readonly myTurn = computed(() => {
    const me = this.identity();

    return this.turns().find((turn) => turn.participantId === me?.participantId) ?? null;
  });

  protected readonly iCollectThisMonth = computed(
    () => this.currentTurn()?.participantId === this.identity()?.participantId
  );

  private readonly currentPayment = computed(
    () => this.payments().find((payment) => payment.month === this.currentMonth()) ?? null
  );

  protected readonly alreadyMarked = computed(() => this.currentPayment()?.marked === true);

  /** Confirmado por el organizador: ya no se puede deshacer. */
  protected readonly alreadyConfirmed = computed(() => this.currentPayment()?.confirmed === true);

  /** La porra aún no ha llegado a su primer mes. */
  protected readonly notStarted = computed(() => {
    const turns = this.turns();

    return turns.length > 0 && this.currentMonth() < turns[0].month;
  });

  /** Ya han cobrado todos. */
  protected readonly finished = computed(() => {
    const turns = this.turns();

    return turns.length > 0 && this.currentMonth() > turns[turns.length - 1].month;
  });

  /** Ni cuota que pagar ni nada que decidir este mes. */
  protected readonly nothingToPay = computed(
    () => this.notStarted() || this.finished() || this.iCollectThisMonth()
  );

  constructor() {
    inject(BodyShellService).useSimpleShell();
  }

  ngOnInit(): void {
    this.identity.set(this.session.get(this.poolId()));
    this.load();
  }

  /** Paso 1: tocar tu nombre. */
  protected chooseIdentity(person: ParticipantRes): void {
    const identity: ParticipantIdentity = {
      participantId: person.participantId,
      fullName: person.fullName
    };

    this.session.save(this.poolId(), identity);
    this.identity.set(identity);
    this.loadMyPayments();
  }

  /** El «no soy yo»: vuelve al paso 1. */
  protected forgetIdentity(): void {
    this.session.clear(this.poolId());
    this.identity.set(null);
    this.payments.set([]);
  }

  /**
   * Paso 2: decir que ya has pagado.
   */
  protected markPaid(): void {
    const me = this.identity();
    if (!me || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    this.pools.markPaid(this.poolId(), this.currentMonth(), me.participantId).subscribe({
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

  /** Iniciales con las que se representa a cada participante. */
  protected initials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  /** Convierte un `AAAA-MM` en fecha, para poder darle formato en la vista. */
  protected toDate(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Date(year, monthNumber - 1, 1);
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
        this.turns.set(order.turns);
        this.currentMonth.set(order.currentMonth);
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
    const me = this.identity();
    if (!me) {
      return;
    }

    this.pools.getMyPayments(this.poolId(), me.participantId).subscribe({
      next: (payments) => this.payments.set(payments)
    });
  }
}
