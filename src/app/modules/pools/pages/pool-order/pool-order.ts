import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetOrderRes } from '@app/models/get-order-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { TurnRes } from '@app/models/turn-res';
import { TurnState } from '@app/modules/pools/models/turn-state';
import { PoolsService } from '@app/services/pages/pools.service';
import { MonthDatePipe } from '@app/shared/pipes/month-date.pipe';
import {
  ParticipantIdentity,
  ParticipantSession
} from '@app/services/session/participant-session.service';

@Component({
  selector: 'app-pool-order',
  imports: [RouterLink, DecimalPipe, MonthDatePipe],
  templateUrl: './pool-order.html',
  styleUrl: './pool-order.css'
})
export class PoolOrder implements OnInit {
  private static readonly PERCENT = 100;

  private readonly pools = inject(PoolsService);
  private readonly session = inject(ParticipantSession);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  private readonly order = signal<GetOrderRes | null>(null);

  protected readonly turns = computed(() => this.order()?.turns ?? []);
  protected readonly currentMonth = computed(() => this.order()?.currentMonth ?? '');

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Con quién se está usando esta porra, si ya se ha elegido. */
  protected readonly identity = signal<ParticipantIdentity | null>(null);

  /** Pulso del mes en curso: cuotas confirmadas y cuántas se esperan. */
  protected readonly confirmedPayments = computed(() => this.order()?.confirmedPayments ?? 0);
  protected readonly expectedPayments = computed(() => this.order()?.expectedPayments ?? 0);

  /** Filtro de la tabla; `ALL` no filtra nada. */
  protected readonly filter = signal<TurnState | 'ALL'>('ALL');

  protected readonly drawn = computed(() => this.turns().length > 0);

  /** Quien cobra el mes en curso, si la porra está en marcha. */
  protected readonly beneficiary = computed(
    () => this.turns().find((turn) => turn.month === this.currentMonth()) ?? null
  );

  /** Quien cobra no paga su cuota: el bote lo ponen todos los demás. */
  protected readonly monthlyPot = computed(() => {
    const currentPool = this.pool();
    if (!currentPool) {
      return 0;
    }

    return currentPool.monthlyFee * Math.max(currentPool.numParticipants - 1, 0);
  });

  /** Turnos cuyo mes ya pasó. */
  protected readonly closedCount = computed(
    () => this.turns().filter((turn) => turn.month < this.currentMonth()).length
  );

  protected readonly progress = computed(() => {
    const total = this.turns().length;
    if (total === 0) {
      return 0;
    }

    return Math.round((this.closedCount() / total) * PoolOrder.PERCENT);
  });

  protected readonly distributed = computed(() => this.closedCount() * this.monthlyPot());

  protected readonly pendingAmount = computed(
    () => (this.turns().length - this.closedCount()) * this.monthlyPot()
  );

  /** El mes en curso cae antes del primer turno: la porra aún no arranca. */
  protected readonly notStarted = computed(() => {
    const turns = this.turns();

    return turns.length > 0 && this.currentMonth() < turns[0].month;
  });

  /** El mes en curso cae después del último turno: la porra terminó. */
  protected readonly finished = computed(() => {
    const turns = this.turns();

    return turns.length > 0 && this.currentMonth() > turns[turns.length - 1].month;
  });

  protected readonly myTurn = computed(() => {
    const me = this.identity();
    if (!me) {
      return null;
    }

    return this.turns().find((turn) => turn.participantPublicId === me.participantPublicId) ?? null;
  });

  /**
   * Cuotas que me quedan por pagar: los meses que faltan menos el mío, porque
   * quien cobra ese mes no paga.
   */
  protected readonly myRemainingFees = computed(() => {
    const me = this.identity();
    if (!me) {
      return 0;
    }

    return this.turns().filter(
      (turn) => turn.month >= this.currentMonth() && turn.participantPublicId !== me.participantPublicId
    ).length;
  });

  protected readonly lastMonth = computed(() => {
    const turns = this.turns();

    return turns.length > 0 ? turns[turns.length - 1].month : '';
  });

  protected readonly visibleTurns = computed(() => {
    const selected = this.filter();
    if (selected === 'ALL') {
      return this.turns();
    }

    return this.turns().filter((turn) => this.stateOf(turn) === selected);
  });

  ngOnInit(): void {
    this.identity.set(this.session.get(this.poolId()));
    this.load();
  }

  protected isMe(turn: TurnRes): boolean {
    return turn.participantPublicId === this.identity()?.participantPublicId;
  }

  /** En qué punto está un turno respecto al mes en curso. */
  protected stateOf(turn: TurnRes): TurnState {
    if (turn.month < this.currentMonth()) {
      return 'COLLECTED';
    }

    return turn.month === this.currentMonth() ? 'CURRENT' : 'PENDING';
  }

  /** Cambia el filtro de la tabla. */
  protected filterBy(selected: TurnState | 'ALL'): void {
    this.filter.set(selected);
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

  /** Carga la porra y su orden de cobro. */
  private load(): void {
    this.pools.getPool(this.poolId()).subscribe({
      next: (pool) => {
        this.pool.set(pool);
        this.loadOrder();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Segunda parte de la carga: el orden y el mes en curso. */
  private loadOrder(): void {
    this.pools.getOrder(this.poolId()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }
}
