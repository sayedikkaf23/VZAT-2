import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navigation-panel',
  imports: [CommonModule],
  templateUrl: './navigation-panel.html',
  styleUrl: './navigation-panel.scss'
})
export class NavigationPanel {

  constructor(private router: Router) {}

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}

