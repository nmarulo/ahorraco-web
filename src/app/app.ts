import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '@app/layout/footer/footer';
import { Header } from '@app/layout/header/header';
import { Sidebar } from '@app/layout/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Sidebar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
