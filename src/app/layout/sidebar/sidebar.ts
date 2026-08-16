import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  host: { class: 'app-sidebar bg-body-secondary shadow', 'data-bs-theme': 'dark' },
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {}
