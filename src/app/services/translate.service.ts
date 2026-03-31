import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LANGUAGE_OPTIONS } from '../constants/constant';

export interface TranslationEntry {
  key: string;
  value: string;
}

const CACHE_KEY_PREFIX = 'portfolio_translations_';

const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  EN: {},
  HI: {
    Developer: 'डेवलपर',
    'Loading sections...': 'सेक्शन लोड हो रहे हैं...',
    English: 'अंग्रेज़ी',
    Hindi: 'हिंदी',
    Kannada: 'कन्नड़',
    Success: 'सफल',
    'Something Went Wrong': 'कुछ गलत हो गया',
    'Dismiss popup': 'पॉपअप बंद करें'
  },
  KN: {
    Developer: 'ಡೆವಲಪರ್',
    'Loading sections...': 'ವಿಭಾಗಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...',
    English: 'ಇಂಗ್ಲಿಷ್',
    Hindi: 'ಹಿಂದಿ',
    Kannada: 'ಕನ್ನಡ',
    Success: 'ಯಶಸ್ಸು',
    'Something Went Wrong': 'ಏನೋ ತಪ್ಪಾಗಿದೆ',
    'Dismiss popup': 'ಪಾಪ್‌ಅಪ್ ಮುಚ್ಚಿ'
  }
};

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly activeLanguage = signal<string>('EN');
  private readonly dictionary = signal<Record<string, string>>({});

  get language(): string {
    return this.activeLanguage();
  }

  setLanguage(code: string): void {
    const safeCode = this.normalizeCode(code);
    this.activeLanguage.set(safeCode);
    this.dictionary.set(this.resolveDictionary(safeCode));
  }

  translate(text: string | null | undefined): string {
    if (!text) {
      return '';
    }

    return this.dictionary()[text] ?? text;
  }

  updateFromApi(languageCode: string, entries: TranslationEntry[]): void {
    const safeCode = this.normalizeCode(languageCode);
    const mapped = entries.reduce<Record<string, string>>((acc, item) => {
      if (item.key && item.value) {
        acc[item.key] = item.value;
      }
      return acc;
    }, {});

    this.saveCache(safeCode, mapped);
    if (this.activeLanguage() === safeCode) {
      this.dictionary.set({
        ...this.resolveDictionary(safeCode),
        ...mapped
      });
    }
  }

  private normalizeCode(code: string): string {
    const normalized = code?.toUpperCase?.() ?? 'EN';
    const allowed = LANGUAGE_OPTIONS.some(option => option.code === normalized);
    return allowed ? normalized : 'EN';
  }

  private resolveDictionary(languageCode: string): Record<string, string> {
    const fromStatic = STATIC_TRANSLATIONS[languageCode] ?? {};
    const fromCache = this.readCache(languageCode);
    return {
      ...fromStatic,
      ...fromCache
    };
  }

  private readCache(languageCode: string): Record<string, string> {
    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }

    const key = `${CACHE_KEY_PREFIX}${languageCode}`;
    const fromSession = sessionStorage.getItem(key);
    const fromLocal = localStorage.getItem(key);
    const raw = fromSession || fromLocal;

    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveCache(languageCode: string, map: Record<string, string>): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const key = `${CACHE_KEY_PREFIX}${languageCode}`;
    const raw = JSON.stringify(map);
    sessionStorage.setItem(key, raw);
    localStorage.setItem(key, raw);
  }
}
