import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export interface LoaderState {
  visible: boolean;
  label: string;
  signature: string;
}

export interface LoaderOptions {
  label?: string;
  signature?: string;
}

const DEFAULT_LABEL = 'Loading...';
const DEFAULT_SIGNATURE = 'MN';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly _state = signal<LoaderState>({
    visible: true,
    label: 'Loading profile...',
    signature: DEFAULT_SIGNATURE
  });

  readonly state = this._state.asReadonly();

  show(options?: LoaderOptions): void {
    this._state.set({
      visible: true,
      label: options?.label || DEFAULT_LABEL,
      signature: (options?.signature || DEFAULT_SIGNATURE).trim().slice(0, 4) || DEFAULT_SIGNATURE
    });
    this.setScrollLock(true);
  }

  hide(): void {
    this._state.update(current => ({ ...current, visible: false }));
    this.setScrollLock(false);
  }

  private setScrollLock(isLocked: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const body = this.document.body;
    const html = this.document.documentElement;
    if (!body || !html) {
      return;
    }

    if (isLocked) {
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      return;
    }

    body.style.removeProperty('overflow');
    html.style.removeProperty('overflow');
  }
}
