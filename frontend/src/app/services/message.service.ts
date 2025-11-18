import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private sidebarLoadedSource = new BehaviorSubject<boolean>(false);
  sidebarLoaded$ = this.sidebarLoadedSource.asObservable();

  setSidebarLoaded(status: boolean) {
    this.sidebarLoadedSource.next(status);
  }

  private messageSource = new BehaviorSubject<string>('');
  message$ = this.messageSource.asObservable();

  setMessage(message: string) {
    this.messageSource.next(message);
  }
}


