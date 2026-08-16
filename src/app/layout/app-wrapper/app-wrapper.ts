import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '@app/layout/footer/footer';
import { Header } from '@app/layout/header/header';
import { Sidebar } from '@app/layout/sidebar/sidebar';
import { BodyShellService } from '@app/services/layout/body-shell.service';

@Component({
  selector: 'app-wrapper',
  imports: [RouterOutlet, Header, Sidebar, Footer],
  host: { class: 'app-wrapper' },
  templateUrl: './app-wrapper.html',
  styleUrl: './app-wrapper.css'
})
export class AppWrapper {
  constructor() {
    inject(BodyShellService).useAppShell();
  }
}
