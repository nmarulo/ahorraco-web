import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GetPoolRes } from '@app/models/get-pool-res';
import { BodyShellService } from '@app/services/layout/body-shell.service';
import { PoolsService } from '@app/services/pages/pools.service';
import { OrganizerSession } from '@app/services/session/organizer-session.service';
import { SelectedPoolSession } from '@app/services/session/selected-pool-session.service';

/**
 * Página accesible desde `/organizer-access` y desde `/pools/:poolId/organizer-access`.
 */
@Component({
  selector: 'app-organizer-access',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './organizer-access.html',
  styleUrl: './organizer-access.css'
})
export class OrganizerAccess implements OnInit {
  /** Lo que acepta la API para el código de gestión: entre 4 y 30 caracteres. */
  private static readonly CODE_MIN_LENGTH = 4;
  private static readonly CODE_MAX_LENGTH = 30;

  /** Holgado a propósito: aquí se puede pegar el enlace de invitación entero. */
  private static readonly INVITATION_MAX_LENGTH = 60;

  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);
  private readonly organizer = inject(OrganizerSession);
  private readonly selectedPool = inject(SelectedPoolSession);

  /**
   * Si no se indica se buscara usando el código de invitación.
   */
  readonly poolId = input<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);

  /**
   * Pagina cargada sin poolId en la URL.
   */
  protected readonly fromScratchWithoutPoolId = signal(false);

  protected readonly loading = signal(false);
  protected readonly searchingPool = signal(false);
  protected readonly checking = signal(false);

  /**
   * Indica que ya está identificado como organizador.
   */
  protected readonly granted = signal(false);

  protected readonly notFoundPool = signal(false);

  protected readonly rejected = signal(false);

  protected readonly errorMessageAPI = signal<string | null>(null);

  protected readonly poolForm = this.formBuilder.nonNullable.group({
    invitationToken: ['', Validators.required]
  });

  /** Paso 2: acreditar que se es el organizador. */
  protected readonly organizerForm = this.formBuilder.nonNullable.group({
    managementCode: [
      '',
      [
        Validators.required,
        Validators.minLength(OrganizerAccess.CODE_MIN_LENGTH),
        Validators.maxLength(OrganizerAccess.CODE_MAX_LENGTH)
      ]
    ]
  });

  readonly codeMaxLength = OrganizerAccess.CODE_MAX_LENGTH;
  readonly invitationMaxLength = OrganizerAccess.INVITATION_MAX_LENGTH;

  constructor() {
    inject(BodyShellService).useLoginShell();
  }

  ngOnInit(): void {
    const routePoolId = this.poolId();

    if (!routePoolId) {
      this.fromScratchWithoutPoolId.set(true);
      return;
    }

    this.granted.set(this.organizer.get(routePoolId) !== null);
    this.loadPool(routePoolId);
  }

  protected searchPool(): void {
    if (this.searchingPool() || this.poolForm.invalid) {
      this.poolForm.markAllAsTouched();
      return;
    }

    const token = OrganizerAccess.tokenFrom(this.poolForm.getRawValue().invitationToken);

    this.searchingPool.set(true);
    this.notFoundPool.set(false);
    this.errorMessageAPI.set(null);

    this.pools.getPoolByInvitation(token).subscribe({
      next: (pool) => {
        this.selectedPool.select({ publicId: pool.publicId, name: pool.name });
        this.pool.set(pool);
        this.granted.set(this.organizer.get(pool.publicId) !== null);
        this.searchingPool.set(false);
      },
      error: () => {
        this.notFoundPool.set(true);
        this.searchingPool.set(false);
      }
    });
  }

  protected searchAnotherPool(): void {
    this.pool.set(null);
    this.granted.set(false);
    this.rejected.set(false);
    this.notFoundPool.set(false);
    this.organizerForm.reset();
    this.poolForm.reset();
  }

  protected submit(): void {
    const currentPool = this.pool();

    if (this.checking() || !currentPool || this.organizerForm.invalid) {
      this.organizerForm.markAllAsTouched();
      return;
    }

    this.checking.set(true);
    this.rejected.set(false);
    this.errorMessageAPI.set(null);

    const managementCode = this.organizerForm.getRawValue().managementCode;

    this.pools.getPool(currentPool.publicId, managementCode).subscribe({
      next: (pool) => {
        this.organizer.save(pool.publicId, pool.managementCode ?? managementCode);
        this.pool.set(pool);
        this.granted.set(true);
        this.checking.set(false);
      },
      error: () => {
        this.rejected.set(true);
        this.checking.set(false);
      }
    });
  }

  /** Deja de ser organizador en este navegador, sin soltar la porra elegida. */
  protected signOut(): void {
    const currentPool = this.pool();
    if (!currentPool) {
      return;
    }

    this.organizer.clear(currentPool.publicId);
    this.granted.set(false);
    this.organizerForm.reset();
  }

  private loadPool(poolId: string): void {
    this.loading.set(true);

    this.pools.getPool(poolId).subscribe({
      next: (pool) => {
        this.selectedPool.select({ publicId: pool.publicId, name: pool.name });
        this.pool.set(pool);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessageAPI.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /**
   * El campo admite el enlace de invitación entero, que es lo que el
   * organizador tiene a mano en el WhatsApp del grupo. De `…/join/ABC123` se
   * queda con el último tramo.
   */
  private static tokenFrom(value: string): string {
    const trimmed = value.trim().replace(/\/+$/, '');

    return trimmed.slice(trimmed.lastIndexOf('/') + 1);
  }
}
