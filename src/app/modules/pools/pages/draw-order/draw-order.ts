import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CreateDrawReq } from '@app/models/create-draw-req';
import { GetPoolRes } from '@app/models/get-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { TurnRes } from '@app/models/turn-res';
import { PoolsService } from '@app/services/pages/pools.service';

@Component({
  selector: 'app-draw-order',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './draw-order.html',
  styleUrl: './draw-order.css'
})
export class DrawOrder implements OnInit {
  /** Cada cuánto cambia el nombre que da vueltas en el bombo. */
  private static readonly SPIN_MS = 70;

  /** Cada cuánto cae un turno en la lista de resultados. */
  private static readonly REVEAL_MS = 220;

  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);
  private readonly destroyRef = inject(DestroyRef);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly participants = signal<ParticipantRes[]>([]);
  protected readonly turns = signal<TurnRes[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Turnos ya visibles: se van soltando de uno en uno con la animación. */
  protected readonly revealed = signal<TurnRes[]>([]);
  protected readonly drawing = signal(false);
  protected readonly drumName = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    organizerFirst: [false],
    organizerParticipantId: ['']
  });

  /** Quien cobra no paga su cuota: el bote lo ponen todos los demás. */
  protected readonly monthlyPot = computed(() => {
    const currentPool = this.pool();
    if (!currentPool) {
      return 0;
    }

    return currentPool.monthlyFee * Math.max(currentPool.numParticipants - 1, 0);
  });

  protected readonly missing = computed(() => {
    const total = this.pool()?.numParticipants ?? 0;

    return Math.max(total - this.participants().length, 0);
  });

  /** El sorteo necesita al grupo completo. */
  protected readonly everyoneJoined = computed(() => this.pool() !== null && this.missing() === 0);

  /**
   * Ya sorteado **y con la animación terminada**: la pantalla pasa a ser de
   * solo lectura.
   *
   * El `!drawing()` no sobra: la respuesta llega antes de que acabe de caer el
   * último turno, y sin él el bombo y el botón desaparecerían a media
   * animación.
   */
  protected readonly alreadyDrawn = computed(() => this.turns().length > 0 && !this.drawing());

  constructor() {
    this.form.controls.organizerFirst.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((first) => this.updateOrganizerValidation(first));
  }

  ngOnInit(): void {
    this.load();
  }

  /** Lanza el sorteo. No hay vuelta atrás. */
  protected draw(): void {
    if (this.drawing() || this.alreadyDrawn() || !this.everyoneJoined()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.drawing.set(true);
    this.errorMessage.set(null);
    this.revealed.set([]);
    this.spinDrum();

    this.pools.createDraw(this.poolId(), this.buildRequest()).subscribe({
      next: (turns) => {
        this.turns.set(turns);
        this.revealTurns(turns);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.stopDrum();
        this.drawing.set(false);
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

  /** Carga la porra, quién se ha unido y si ya hay orden sorteado. */
  private load(): void {
    this.pools.getPool(this.poolId()).subscribe({
      next: (pool) => {
        this.pool.set(pool);
        this.loadParticipantsAndOrder();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Segunda parte de la carga. */
  private loadParticipantsAndOrder(): void {
    this.pools.getParticipants(this.poolId()).subscribe({
      next: (participants) => this.participants.set(participants)
    });

    this.pools.getOrder(this.poolId()).subscribe({
      next: (order) => {
        this.turns.set(order.turns);
        this.revealed.set(order.turns);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Hace girar el bombo con nombres al azar mientras dura el sorteo. */
  private spinDrum(): void {
    const names = this.participants().map((person) => person.fullName);
    if (names.length === 0) {
      return;
    }

    const spin = setInterval(() => {
      this.drumName.set(names[Math.floor(Math.random() * names.length)]);
    }, DrawOrder.SPIN_MS);

    this.stopSpin = () => clearInterval(spin);
    this.destroyRef.onDestroy(this.stopSpin);
  }

  /** Va soltando los turnos de uno en uno, como el bombo del prototipo. */
  private revealTurns(turns: readonly TurnRes[]): void {
    let index = 0;

    const reveal = setInterval(() => {
      this.revealed.update((shown) => [...shown, turns[index]]);
      index += 1;

      if (index >= turns.length) {
        clearInterval(reveal);
        this.stopDrum();
        this.drawing.set(false);
      }
    }, DrawOrder.REVEAL_MS);

    this.destroyRef.onDestroy(() => clearInterval(reveal));
  }

  /** Para el bombo y lo deja en blanco. */
  private stopDrum(): void {
    this.stopSpin();
    this.drumName.set(null);
  }

  /** Corta el intervalo del bombo; se sustituye al arrancarlo. */
  private stopSpin: () => void = () => undefined;

  /** Arma la petición a partir del formulario. */
  private buildRequest(): CreateDrawReq {
    const values = this.form.getRawValue();

    return {
      organizerFirst: values.organizerFirst,
      ...(values.organizerFirst ? { organizerPublicId: values.organizerParticipantId } : {})
    };
  }

  /** Solo hay que decir quién eres si te reservas el primer turno. */
  private updateOrganizerValidation(organizerFirst: boolean): void {
    const control = this.form.controls.organizerParticipantId;

    if (organizerFirst) {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
    }

    control.updateValueAndValidity();
  }
}
