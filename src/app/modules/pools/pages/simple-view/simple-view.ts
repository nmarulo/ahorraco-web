import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetOrderRes } from '@app/models/get-order-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { MyPaymentRes } from '@app/models/get-my-payments-res';
import { BodyShellService } from '@app/services/layout/body-shell.service';
import { PoolsService } from '@app/services/pages/pools.service';
import { MonthDatePipe } from '@app/shared/pipes/month-date.pipe';
import { InitialsPipe } from '@app/shared/pipes/initials.pipe';
import {
  ParticipantIdentity,
  ParticipantSession
} from '@app/services/session/participant-session.service';

@Component({
  selector: 'app-simple-view',
  imports: [RouterLink, DecimalPipe, MonthDatePipe, InitialsPipe],
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
  protected readonly payments = signal<MyPaymentRes[]>([]);

  private readonly order = signal<GetOrderRes | null>(null);

  protected readonly turns = computed(() => this.order()?.turns ?? []);
  protected readonly currentMonth = computed(() => this.order()?.currentMonth ?? '');
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

    return this.turns().find((turn) => turn.participantPublicId === me?.participantPublicId) ?? null;
  });

  protected readonly iCollectThisMonth = computed(
    () => this.currentTurn()?.participantPublicId === this.identity()?.participantPublicId
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
      participantPublicId: person.publicId,
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

    const month = this.currentMonth();

    this.pools
      .markPaid(this.poolId(), { participantPublicId: me.participantPublicId, month })
      .subscribe({
      next: (payment) => {
        this.payments.update((all) => [
          ...all.filter((one) => one.month !== payment.month),
          { month: payment.month, marked: payment.marked, confirmed: false }
        ]);
        this.sending.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.sending.set(false);
      }
    });
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
    const me = this.identity();
    if (!me) {
      return;
    }

    this.pools.getMyPayments(this.poolId(), me.participantPublicId).subscribe({
      next: (payments) => this.payments.set(payments)
    });
  }
}
