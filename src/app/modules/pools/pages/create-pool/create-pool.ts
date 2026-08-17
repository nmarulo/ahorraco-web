import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { CreatePoolReq, PaymentDueDay } from '@app/models/create-pool-req';
import { CreatePoolRes } from '@app/models/create-pool-res';
import { CodeMode } from '@app/modules/pools/models/code-mode';
import { PoolsService } from '@app/services/pages/pools.service';

@Component({
  selector: 'app-create-pool',
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './create-pool.html',
  styleUrl: './create-pool.css'
})
export class CreatePool {
  /** Mínimo para que la porra tenga sentido: alguien cobra y alguien paga. */
  protected static readonly MIN_PARTICIPANTS = 2;

  /** Tope para que el sorteo y las listas sigan siendo manejables. */
  protected static readonly MAX_PARTICIPANTS = 30;

  private static readonly MIN_CODE_LENGTH = 4;
  private static readonly MAX_CODE_LENGTH = 30;
  private static readonly MAX_NAME_LENGTH = 80;

  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);

  protected readonly minParticipants = CreatePool.MIN_PARTICIPANTS;
  protected readonly maxParticipants = CreatePool.MAX_PARTICIPANTS;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(CreatePool.MAX_NAME_LENGTH)]],
    monthlyFee: [100, [Validators.required, Validators.min(1)]],
    numParticipants: [
      10,
      [
        Validators.required,
        Validators.min(CreatePool.MIN_PARTICIPANTS),
        Validators.max(CreatePool.MAX_PARTICIPANTS)
      ]
    ],
    startDate: [CreatePool.currentMonth(), Validators.required],
    paymentDueDay: ['DAY_10' as PaymentDueDay, Validators.required],
    notes: [''],
    codeMode: ['GENERATED' as CodeMode],
    customCode: ['']
  });

  /** Valores del formulario como señal, para que la vista previa sea reactiva. */
  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  /** Parte aleatoria del código propuesto; solo cambia si se pide otro. */
  private readonly codeSuffix = signal(this.pools.generateSuffix());

  protected readonly sending = signal(false);
  protected readonly result = signal<CreatePoolRes | null>(null);
  protected readonly copied = signal(false);

  protected readonly previewName = computed(() => this.values().name.trim() || 'Tu porra');

  /** Cada participante cobra un mes, así que la duración es el nº de participantes. */
  protected readonly durationMonths = computed(() =>
    CreatePool.toNumber(this.values().numParticipants)
  );

  /** Quien cobra no paga su cuota: el bote lo ponen todos los demás. */
  protected readonly monthlyPot = computed(() => {
    const fee = CreatePool.toNumber(this.values().monthlyFee);
    const payers = Math.max(this.durationMonths() - 1, 0);

    return fee * payers;
  });

  protected readonly suggestedCode = computed(() =>
    this.pools.composeManagementCode(this.values().name, this.codeSuffix())
  );

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
    this.pools.createPool(this.buildRequest()).subscribe({
      next: (response) => {
        this.result.set(response);
        this.sending.set(false);
      },
      // Sin manejo de errores todavía: el mock nunca falla y el tratamiento
      // centralizado de errores de la API llega al conectar `ahorraco-api`.
      error: () => this.sending.set(false)
    });
  }

  /** Propone otro código de gestión, manteniendo las iniciales del nombre. */
  protected regenerateCode(): void {
    this.codeSuffix.set(this.pools.generateSuffix());
  }

  /** Copia el código de gestión al portapapeles. */
  protected async copyCode(): Promise<void> {
    const created = this.result();
    if (!created) {
      return;
    }

    try {
      await navigator.clipboard.writeText(created.managementCode);
      this.copied.set(true);
    } catch {
      // El portapapeles falla en contextos no seguros; el código se ve en
      // pantalla y se puede seleccionar a mano.
      this.copied.set(false);
    }
  }

  /** Vuelve al formulario vacío para dar de alta otra porra. */
  protected startAnother(): void {
    this.form.reset();
    this.form.controls.startDate.setValue(CreatePool.currentMonth());
    this.codeSuffix.set(this.pools.generateSuffix());
    this.result.set(null);
    this.copied.set(false);
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
      startDate: values.startDate,
      paymentDueDay: values.paymentDueDay,
      ...(notes ? { notes } : {}),
      managementCode:
        values.codeMode === 'CUSTOM' ? values.customCode.trim() : this.suggestedCode()
    };
  }

  /** El código propio solo es obligatorio si el organizador elige escribirlo. */
  private updateCodeValidation(mode: CodeMode): void {
    const control = this.form.controls.customCode;

    if (mode === 'CUSTOM') {
      control.setValidators([
        Validators.required,
        Validators.minLength(CreatePool.MIN_CODE_LENGTH),
        Validators.maxLength(CreatePool.MAX_CODE_LENGTH)
      ]);
    } else {
      control.clearValidators();
    }

    control.updateValueAndValidity();
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
