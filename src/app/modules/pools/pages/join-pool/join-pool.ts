import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GetPoolInvitationRes } from '@app/models/get-pool-invitation-res';
import { JoinPoolReq } from '@app/models/join-pool-req';
import { BodyShellService } from '@app/services/layout/body-shell.service';
import { PoolsService } from '@app/services/pages/pools.service';
import { ParticipantSession } from '@app/services/session/participant-session.service';
import { SelectedPoolSession } from '@app/services/session/selected-pool-session.service';

@Component({
  selector: 'app-join-pool',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './join-pool.html',
  styleUrl: './join-pool.css',
})
export class JoinPool implements OnInit {
  private static readonly MAX_NAME_LENGTH = 80;

  /** Permisivo a propósito: dígitos, espacios, guiones, puntos y prefijo. */
  private static readonly PHONE_PATTERN = /^\+?[\d\s.-]{6,20}$/;

  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);
  private readonly session = inject(ParticipantSession);
  private readonly selectedPool = inject(SelectedPoolSession);

  /**
   * Si no se indica aparece un formulario de búsqueda.
   */
  readonly invitationToken = input<string>();

  protected readonly pool = signal<GetPoolInvitationRes | null>(null);

  /**
   * Token de invitación usado para buscar la porra.
   */
  private readonly token = signal('');

  protected readonly fromScratchWithoutToken = signal(false);

  protected readonly searchingPool = signal(false);
  protected readonly notFoundPool = signal(false);

  protected readonly loading = signal(false);
  protected readonly sending = signal(false);
  protected readonly joined = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Paso previo, solo en `/join`: dar con la porra por su código. */
  protected readonly poolForm = this.formBuilder.nonNullable.group({
    invitationToken: ['', Validators.required],
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(JoinPool.MAX_NAME_LENGTH)]],
    phone: ['', Validators.pattern(JoinPool.PHONE_PATTERN)],
    accepted: [true, Validators.requiredTrue],
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

  protected readonly poolId = computed(() => this.pool()?.publicId || '0');

  constructor() {
    inject(BodyShellService).useLoginShell();
  }

  ngOnInit(): void {
    const routeToken = this.invitationToken();

    if (!routeToken) {
      this.fromScratchWithoutToken.set(true);
      return;
    }

    this.loading.set(true);
    this.pools.getPoolByInvitation(routeToken).subscribe({
      next: (pool) => {
        this.selectedPool.select({ publicId: pool.publicId, name: pool.name });
        this.token.set(routeToken);
        this.pool.set(pool);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      },
    });
  }

  protected searchPool(): void {
    if (this.searchingPool() || this.poolForm.invalid) {
      this.poolForm.markAllAsTouched();
      return;
    }

    const token = JoinPool.tokenFrom(this.poolForm.getRawValue().invitationToken);

    this.searchingPool.set(true);
    this.notFoundPool.set(false);
    this.errorMessage.set(null);

    this.pools.getPoolByInvitation(token).subscribe({
      next: (pool) => {
        this.selectedPool.select({ publicId: pool.publicId, name: pool.name });
        this.token.set(token);
        this.pool.set(pool);
        this.searchingPool.set(false);
      },
      error: () => {
        this.notFoundPool.set(true);
        this.searchingPool.set(false);
      },
    });
  }

  protected searchAnotherPool(): void {
    this.pool.set(null);
    this.token.set('');
    this.joined.set(false);
    this.notFoundPool.set(false);
    this.errorMessage.set(null);
    this.poolForm.reset();
    this.form.reset();
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

    const currentPool = this.pool();

    if (!currentPool) {
      return;
    }

    this.pools.joinPool(currentPool.publicId, this.buildRequest()).subscribe({
      next: (response) => {
        // Quien se une desde este navegador queda identificado sin tener que
        // elegirse el nombre de la lista después.
        this.session.save(currentPool.publicId, {
          participantPublicId: response.publicId,
          fullName: this.form.getRawValue().fullName.trim(),
        });

        this.joined.set(true);
        this.sending.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.sending.set(false);
      },
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
      invitationToken: this.token(),
      fullName: values.fullName.trim(),
      ...(phone ? { phone } : {}),
    };
  }

  /**
   * El campo admite el enlace de invitación entero, que es lo que llega por
   * WhatsApp. De `…/join/ABC123` se queda con el último tramo.
   */
  private static tokenFrom(value: string): string {
    const trimmed = value.trim().replace(/\/+$/, '');

    return trimmed.slice(trimmed.lastIndexOf('/') + 1);
  }
}
