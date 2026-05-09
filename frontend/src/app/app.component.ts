import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  steps = [
    { label: 'Admin', route: '/admin', icon: '1' },
    { label: 'Authority', route: '/authority', icon: '2' },
    { label: 'Program', route: '/program', icon: '3' }
  ];

  constructor(public router: Router) {}

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  isCompleted(index: number): boolean {
    const routes = ['/admin', '/authority', '/program'];
    const currentIndex = routes.indexOf(this.router.url);
    return currentIndex > index;
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
