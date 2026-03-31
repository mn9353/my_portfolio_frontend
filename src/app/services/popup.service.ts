import { Injectable, signal } from '@angular/core';

export type PopupType = 'success' | 'failure';

export interface PopupMessage {
  id: number;
  type: PopupType;
  message: string;
  title: string;
}

export interface PopupOptions {
  title?: string;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  private readonly _messages = signal<PopupMessage[]>([]);
  private idSeed = 0;

  readonly messages = this._messages.asReadonly();

  success(message: string, options?: PopupOptions): void {
    this.push('success', message, options);
  }

  failure(message: string, options?: PopupOptions): void {
    this.push('failure', message, options);
  }

  dismiss(id: number): void {
    this._messages.update(messages => messages.filter(item => item.id !== id));
  }

  clear(): void {
    this._messages.set([]);
  }

  private push(type: PopupType, message: string, options?: PopupOptions): void {
    const id = ++this.idSeed;
    const popup: PopupMessage = {
      id,
      type,
      message,
      title: options?.title ?? (type === 'success' ? 'Success' : 'Something Went Wrong')
    };

    this._messages.update(messages => [...messages, popup]);

    const durationMs = options?.durationMs ?? 3500;
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }
}
