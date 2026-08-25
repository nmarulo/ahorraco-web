import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SelectedPoolSession } from '@app/services/session/selected-pool-session.service';
import { OrganizerSession } from '@app/services/session/organizer-session.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  host: { class: 'app-sidebar bg-body-secondary shadow', 'data-bs-theme': 'dark' },
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly organizer = inject(OrganizerSession);

  protected readonly pool = inject(SelectedPoolSession).current;

  protected readonly isOrganizer = computed(() => this.organizer.get(this.pool()?.publicId!) !== null);
}
