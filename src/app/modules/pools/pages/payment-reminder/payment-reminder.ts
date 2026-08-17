import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { GetPoolRes } from '@app/models/get-pool-res';
import { GetReminderRes } from '@app/models/get-reminder-res';
import { TurnRes } from '@app/models/turn-res';
import { PoolsService } from '@app/services/pages/pools.service';

@Component({
  selector: 'app-payment-reminder',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './payment-reminder.html',
  styleUrl: './payment-reminder.css'
})
export class PaymentReminder implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pools = inject(PoolsService);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly turns = signal<TurnRes[]>([]);
  protected readonly currentMonth = signal('');
  protected readonly month = signal('');
  protected readonly loading = signal(true);
  protected readonly copied = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Los trozos ya redactados que manda la API. */
  private readonly blocks = signal<GetReminderRes | null>(null);

  /** Qué contar en el texto. */
  protected readonly form = this.formBuilder.nonNullable.group({
    includeBeneficiary: [true],
    includeDebtors: [true],
    includeLink: [true],
    includePaymentDetails: [true]
  });

  private readonly options = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  /**
   * El texto final: se pega en el cliente a partir de los trozos que manda la
   * API, así que cambiar un interruptor es instantáneo y no pide nada.
   */
  protected readonly text = computed(() => {
    const parts = this.blocks();
    if (!parts) {
      return '';
    }

    const options = this.options();

    return [
      parts.greeting,
      options.includeBeneficiary ? parts.beneficiary : '',
      options.includeDebtors ? parts.debtors : '',
      options.includeLink ? parts.link : '',
      options.includePaymentDetails ? parts.paymentDetails : ''
    ]
      .filter((block) => !!block)
      .join('\n\n');
  });

  protected readonly drawn = computed(() => this.turns().length > 0);

  /** Meses que ya han llegado: de los futuros no se avisa. */
  protected readonly openMonths = computed(() =>
    this.turns().filter((turn) => turn.month <= this.currentMonth())
  );

  /** Abre WhatsApp con el texto escrito; enviarlo sigue siendo cosa suya. */
  protected readonly whatsappLink = computed(
    () => `https://wa.me/?text=${encodeURIComponent(this.text())}`
  );

  ngOnInit(): void {
    this.load();
  }

  /** Copia el texto al portapapeles. */
  protected async copyText(): Promise<void> {
    if (!this.text()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.text());
      this.copied.set(true);
    } catch {
      // El portapapeles falla en contextos no seguros; el texto se ve en
      // pantalla y se puede seleccionar a mano.
      this.copied.set(false);
    }
  }

  /** Convierte un `AAAA-MM` en fecha, para poder darle formato en la vista. */
  protected toDate(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Date(year, monthNumber - 1, 1);
  }

  /** Carga la porra y su orden, para saber de qué mes se avisa. */
  private load(): void {
    this.pools.getPool(this.poolId()).subscribe({
      next: (pool) => {
        this.pool.set(pool);

        // Sin nota que incluir, el interruptor no tiene nada que hacer. Se
        // apaga el control, no el atributo del `<input>`: con `formControlName`
        // los formularios reactivos mandan sobre la propiedad `disabled`.
        if (!pool.notes) {
          this.form.controls.includePaymentDetails.setValue(false);
          this.form.controls.includePaymentDetails.disable();
        }

        this.loadOrder();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Segunda parte de la carga. */
  private loadOrder(): void {
    this.pools.getOrder(this.poolId()).subscribe({
      next: (order) => {
        this.turns.set(order.turns);
        this.currentMonth.set(order.currentMonth);
        this.loading.set(false);

        // Se avisa del mes en curso; si la porra ya terminó, del último.
        const months = this.openMonths();
        if (months.length > 0) {
          this.month.set(months[months.length - 1].month);
          this.loadReminder();
        }
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  /** Pide los trozos del recordatorio del mes. */
  private loadReminder(): void {
    if (!this.month()) {
      return;
    }

    this.pools.getReminder(this.poolId(), this.month()).subscribe({
      next: (reminder) => this.blocks.set(reminder),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }
}
