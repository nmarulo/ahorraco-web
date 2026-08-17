import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GetPoolInvitationRes } from '@app/models/get-pool-invitation-res';
import { JoinPoolReq } from '@app/models/join-pool-req';
import { BodyShellService } from '@app/services/layout/body-shell.service';
import { PoolsService } from '@app/services/pages/pools.service';
import { ParticipantSession } from '@app/services/session/participant-session.service';

@Component({
  selector: 'app-join-pool',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './join-pool.html',
  styleUrl: './join-pool.css'
})
export class JoinPool implements OnInit {
  private static readonly MAX_NAME_LENGTH = 80;

  /** Permisivo a propósito: dígitos, espacios, guiones, puntos y prefijo. */
  private static readonly PHONE_PATTERN = /^\+?[\d\s.-]{6,20}$/;

  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);
  private readonly session = inject(ParticipantSession);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly invitationToken = input.required<string>();

  protected readonly pool = signal<GetPoolInvitationRes | null>(null);

  /** Se rellena al unirse, para poder enlazar a la porra ya dentro. */
  protected readonly poolId = signal('');

  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly joined = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(JoinPool.MAX_NAME_LENGTH)]],
    phone: ['', Validators.pattern(JoinPool.PHONE_PATTERN)],
    accepted: [true, Validators.requiredTrue]
  });

  /** Quien cobra no paga su cuota: el bote lo ponen todos los demás. */
  protected readonly monthlyPot = computed(() => {
    const pool = this.pool();
    if (!pool) {
      return 0;
    }

    return pool.monthlyFee * Math.max(pool.numParticipants - 1, 0);
  });

  protected readonly isFull = computed(() => {
    const pool = this.pool();

    return pool !== null && pool.joinedCount >= pool.numParticipants;
  });

  constructor() {
    inject(BodyShellService).useLoginShell();
  }

  ngOnInit(): void {
    this.pools.getPoolByInvitation(this.invitationToken()).subscribe({
      next: (pool) => {
        this.pool.set(pool);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Une a la persona a la porra si el formulario es válido. */
  protected join(): void {
    if (this.sending()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    this.pools.joinPool(this.invitationToken(), this.buildRequest()).subscribe({
      next: (response) => {
        // Quien se une desde este navegador queda identificado sin tener que
        // elegirse el nombre de la lista después.
        const currentPool = this.pool();
        if (currentPool) {
          this.session.save(currentPool.poolId, {
            participantId: response.participantId,
            fullName: this.form.getRawValue().fullName.trim(),
            participantToken: response.participantToken
          });
          this.poolId.set(currentPool.poolId);
        }

        this.joined.set(true);
        this.sending.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.sending.set(false);
      }
    });
  }

  /** Un campo solo se marca en rojo cuando ya se ha tocado. */
  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  /** Arma la petición a partir del formulario. */
  private buildRequest(): JoinPoolReq {
    const values = this.form.getRawValue();
    const phone = values.phone.trim();

    return {
      fullName: values.fullName.trim(),
      ...(phone ? { phone } : {})
    };
  }
}
