import { DOCUMENT, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GetPoolRes } from '@app/models/get-pool-res';
import { ParticipantRes } from '@app/models/participant-res';
import { PoolsService } from '@app/services/pages/pools.service';
import { OrganizerSession } from '@app/services/session/organizer-session.service';

@Component({
  selector: 'app-invite-participants',
  imports: [RouterLink],
  templateUrl: './invite-participants.html',
  styleUrl: './invite-participants.css',
})
export class InviteParticipants implements OnInit {
  private static readonly PERCENT = 100;

  private readonly pools = inject(PoolsService);
  private readonly document = inject(DOCUMENT);
  private readonly organizer = inject(OrganizerSession);

  /** Llega de la ruta gracias a `withComponentInputBinding()`. */
  readonly poolId = input.required<string>();

  protected readonly pool = signal<GetPoolRes | null>(null);
  protected readonly participants = signal<ParticipantRes[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copiedLink = signal(false);
  protected readonly copiedCode = signal(false);

  protected readonly joinedCount = computed(() => this.participants().length);

  protected readonly remaining = computed(() => {
    const total = this.pool()?.numParticipants ?? 0;

    return Math.max(total - this.joinedCount(), 0);
  });

  protected readonly progress = computed(() => {
    const total = this.pool()?.numParticipants ?? 0;
    if (total === 0) {
      return 0;
    }

    return Math.round((this.joinedCount() / total) * InviteParticipants.PERCENT);
  });

  protected readonly invitationLink = computed(() => {
    const token = this.pool()?.invitationToken;
    if (!token) {
      return '';
    }

    return `${this.document.location.origin}/join/${token}`;
  });

  protected readonly whatsappLink = computed(() => {
    const pool = this.pool();
    if (!pool) {
      return '';
    }

    const text =
      `Te invito a la porra «${pool.name}»: ${pool.monthlyFee} € al mes durante ` +
      `${pool.numParticipants} meses. Entra con este enlace y pon tu nombre: ${this.invitationLink()}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

  /** El sorteo necesita que estén todos dentro. */
  protected readonly isOrganizer = computed(() => this.organizer.get(this.poolId()) !== null);

  protected readonly everyoneJoined = computed(
    () => this.pool() !== null && this.remaining() === 0,
  );

  ngOnInit(): void {
    if (!this.isOrganizer()) {
      this.loading.set(false);
      return;
    }

    this.load();
  }

  /** Recarga la porra y su lista de participantes. */
  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.pools.getPool(this.poolId()).subscribe({
      next: (pool) => {
        this.pool.set(pool);
        this.loadParticipants();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      },
    });
  }

  /** Copia el enlace de invitación al portapapeles. */
  protected async copyLink(): Promise<void> {
    this.copiedLink.set(await this.copy(this.invitationLink()));
  }

  /** Copia el código de gestión al portapapeles. */
  protected async copyCode(): Promise<void> {
    this.copiedCode.set(await this.copy(this.pool()?.managementCode ?? ''));
  }

  /** Iniciales con las que se representa a quien no tiene avatar. */
  protected initials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  /** Segunda parte de la carga: quién se ha unido ya. */
  private loadParticipants(): void {
    this.pools.getParticipants(this.poolId()).subscribe({
      next: (participants) => {
        this.participants.set(participants);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      },
    });
  }

  /** Copia un texto y dice si se pudo. */
  private async copy(text: string): Promise<boolean> {
    if (!text) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
