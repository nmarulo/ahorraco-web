import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetPoolRes } from '@app/models/get-pool-res';
import { TurnRes } from '@app/models/turn-res';
import { TurnState } from '@app/modules/pools/models/turn-state';
import { PoolsService } from '@app/services/pages/pools.service';

@Component({
  selector: 'app-pool-order',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './pool-order.html',
  styleUrl: './pool-order.css'
})
export class PoolOrder implements OnInit {
  private static readonly PERCENT = 100;

  private readonly pools = inject(PoolsService);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly turns = signal<TurnRes[]>([]);
  protected readonly currentMonth = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

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

  protected readonly visibleTurns = computed(() => {
    const selected = this.filter();
    if (selected === 'ALL') {
      return this.turns();
    }

    return this.turns().filter((turn) => this.stateOf(turn) === selected);
  });

  ngOnInit(): void {
    this.load();
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
        this.turns.set(order.turns);
        this.currentMonth.set(order.currentMonth);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }
}
