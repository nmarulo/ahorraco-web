import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';

import { CreatePoolReq } from '@app/models/create-pool-req';
import { CodeMode } from '@app/modules/pools/models/code-mode';
import { PoolsService } from '@app/services/pages/pools.service';
import { OrganizerSession } from '@app/services/session/organizer-session.service';
import { SelectedPoolSession } from '@app/services/session/selected-pool-session.service';

@Component({
  selector: 'app-create-pool',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './create-pool.html',
  styleUrl: './create-pool.css',
})
export class CreatePool {
  /** Los mismos límites que valida la API; si no, se responde un 400. */
  protected static readonly MIN_PARTICIPANTS = 2;
  protected static readonly MAX_PARTICIPANTS = 30;
  protected static readonly MIN_DUE_DAY = 1;
  protected static readonly MAX_DUE_DAY = 20;

  private static readonly MIN_CODE_LENGTH = 4;
  private static readonly MAX_CODE_LENGTH = 30;
  private static readonly MAX_NAME_LENGTH = 80;
  private static readonly MAX_NOTES_LENGTH = 500;

  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);
  private readonly organizer = inject(OrganizerSession);
  private readonly selectedPool = inject(SelectedPoolSession);
  private readonly router = inject(Router);

  protected readonly minParticipants = CreatePool.MIN_PARTICIPANTS;
  protected readonly maxParticipants = CreatePool.MAX_PARTICIPANTS;

  protected readonly minStartMonth = CreatePool.currentMonth();

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(CreatePool.MAX_NAME_LENGTH)]],
    monthlyFee: [1, [Validators.required, Validators.min(1)]],
    numParticipants: [
      12,
      [
        Validators.required,
        Validators.min(CreatePool.MIN_PARTICIPANTS),
        Validators.max(CreatePool.MAX_PARTICIPANTS),
      ],
    ],
    startDate: [CreatePool.currentMonth(), [Validators.required, CreatePool.notInThePast]],
    paymentDueDay: [
      10,
      [
        Validators.required,
        Validators.min(CreatePool.MIN_DUE_DAY),
        Validators.max(CreatePool.MAX_DUE_DAY),
      ],
    ],
    notes: ['', Validators.maxLength(CreatePool.MAX_NOTES_LENGTH)],
    codeMode: ['GENERATED' as CodeMode],
    customCode: [''],
  });

  /** Valores del formulario como signal, para la sección "Cómo quedará". */
  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly sending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly previewName = computed(() => this.values().name.trim() || 'Tu porra');

  /** Cada participante cobra un mes, así que la duración es el nº de participantes. */
  protected readonly durationMonths = computed(() =>
    CreatePool.toNumber(this.values().numParticipants),
  );

  /** Quien cobra no paga su cuota: el bote lo ponen todos los demás. */
  protected readonly monthlyPot = computed(() => {
    const fee = CreatePool.toNumber(this.values().monthlyFee);
    const payers = Math.max(this.durationMonths() - 1, 0);

    return fee * payers;
  });

  constructor() {
    this.form.controls.codeMode.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((mode) => this.updateCodeValidation(mode));
  }

  /** Crea la porra si el formulario es válido. */
  protected create(): void {
    if (this.sending()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    this.pools.createPool(this.buildRequest()).subscribe({
      next: (response) => {
        this.organizer.save(response.publicId, response.managementCode);
        this.selectedPool.select({ publicId: response.publicId, name: this.previewName() });
        this.router.navigate(['/pools', response.publicId, 'invite']);
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
  private buildRequest(): CreatePoolReq {
    const values = this.form.getRawValue();
    const notes = values.notes.trim();

    return {
      name: values.name.trim(),
      monthlyFee: values.monthlyFee,
      numParticipants: values.numParticipants,
      // El `<input type="month">` da `AAAA-MM` y la API espera una fecha.
      startDate: `${values.startDate}-01`,
      paymentDueDay: values.paymentDueDay,
      ...(notes ? { notes } : {}),
      ...(values.codeMode === 'CUSTOM' ? { managementCode: values.customCode.trim() } : {}),
    };
  }

  /** El código propio solo es obligatorio si el organizador elige escribirlo. */
  private updateCodeValidation(mode: CodeMode): void {
    const control = this.form.controls.customCode;

    if (mode === 'CUSTOM') {
      control.setValidators([
        Validators.required,
        Validators.minLength(CreatePool.MIN_CODE_LENGTH),
        Validators.maxLength(CreatePool.MAX_CODE_LENGTH),
      ]);
    } else {
      control.clearValidators();
    }

    control.updateValueAndValidity();
  }

  /** La API rechaza empezar en un mes anterior al actual. */
  private static notInThePast(control: AbstractControl): { pastMonth: true } | null {
    const month = control.value as string;

    return month && month < CreatePool.currentMonth() ? { pastMonth: true } : null;
  }

  /** Mes en curso en formato `AAAA-MM`, el que entiende `<input type="month">`. */
  private static currentMonth(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Un `<input type="number">` vacío llega como `null` pese al tipado. */
  private static toNumber(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }
}
