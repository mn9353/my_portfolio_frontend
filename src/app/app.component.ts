import { Component, ElementRef, HostListener, OnInit, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './services/api.service';
import { PopupService } from './services/popup.service';
import { TranslateService } from './services/translate.service';
import { PopupComponent } from './shared/components/popup/popup.component';
import { TranslatePipe } from './pipes/translate.pipe';
import { PortfolioBasic, Project, Section } from './interfaces';
import {
  BASIC_DETAILS_FALLBACK,
  DEFAULT_PORTFOLIO_ID,
  DEFAULT_THEME_MODE,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY
} from './constants/constant';

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PopupComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';
  basicDetails: PortfolioBasic = BASIC_DETAILS_FALLBACK;
  sections: Section[] = [];
  isMenuOpen = false;
  isLanguageMenuOpen = false;
  currentTheme: ThemeMode = DEFAULT_THEME_MODE;
  currentLanguageCode = 'EN';
  isLanguageChanging = false;
  readonly languageOptions = LANGUAGE_OPTIONS;
  private readonly apiService = inject(ApiService);
  private readonly popupService = inject(PopupService);
  private readonly translateService = inject(TranslateService);
  private readonly renderer = inject(Renderer2);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private profileImageIndex = 0;
  private projects: Project[] = [];
  private languageAnimTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.initializeTheme();
    this.initializeLanguage();
    this.translateService.setLanguage(this.currentLanguageCode);

    this.apiService.getPortfolioBasic(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.basicDetails = data;
      this.profileImageIndex = 0;
    }, error => {
      console.error('Error fetching basic details:', error);
      this.popupService.failure('Failed to load profile details. Please try again.');
    });

    this.apiService.getSectionsByPortfolioId(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.sections = data
        .filter(section => section.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }, error => {
      console.error('Error fetching sections:', error);
      this.popupService.failure('Unable to load menu sections right now.');
    });

    this.apiService.getPortfolioProjects(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.projects = data;
    }, error => {
      console.error('Error fetching projects:', error);
      this.popupService.failure('Projects could not be loaded.');
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isMenuOpen = false;
      this.isLanguageMenuOpen = false;
    }
  }

  toggleMenu(): void {
    const next = !this.isMenuOpen;
    this.isMenuOpen = next;
    if (next) {
      this.isLanguageMenuOpen = false;
    }
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  toggleLanguageMenu(): void {
    const next = !this.isLanguageMenuOpen;
    this.isLanguageMenuOpen = next;
    if (next) {
      this.isMenuOpen = false;
    }
  }

  selectLanguage(code: string, event?: MouseEvent): void {
    event?.stopPropagation();
    const changed = this.currentLanguageCode !== code;
    this.currentLanguageCode = code;
    this.translateService.setLanguage(code);
    this.isLanguageMenuOpen = false;
    if (changed) {
      this.triggerLanguageChangeAnimation();
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    }
  }

  selectSection(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isMenuOpen = false;
  }

  get sectionMenuItems(): string[] {
    return this.sections.map(section => section.title || section.sectionKey);
  }

  get profileImageSrc(): string | null {
    const rawUrl = this.basicDetails.profileImageUrl;
    if (!rawUrl) {
      return null;
    }

    const fileId = this.extractDriveFileId(rawUrl);
    if (fileId) {
      const candidates = [
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
        `https://lh3.googleusercontent.com/d/${fileId}`,
        `https://drive.google.com/uc?export=view&id=${fileId}`
      ];

      return candidates[this.profileImageIndex] ?? null;
    }

    return rawUrl;
  }

  onProfileImageError(): void {
    const rawUrl = this.basicDetails.profileImageUrl;
    const fileId = rawUrl ? this.extractDriveFileId(rawUrl) : null;
    if (!fileId) {
      return;
    }

    this.profileImageIndex += 1;
  }

  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.applyTheme(DEFAULT_THEME_MODE, false);
      return;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const safeTheme: ThemeMode = stored === 'dark' || stored === 'light' ? stored : DEFAULT_THEME_MODE;
    this.applyTheme(safeTheme, false);
  }

  private initializeLanguage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.currentLanguageCode = LANGUAGE_OPTIONS[0]?.code ?? 'EN';
      return;
    }

    const storedCode = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const fallbackCode = LANGUAGE_OPTIONS[0]?.code ?? 'EN';
    const isAllowed = LANGUAGE_OPTIONS.some(option => option.code === storedCode);

    this.currentLanguageCode = isAllowed && storedCode ? storedCode : fallbackCode;
  }

  private triggerLanguageChangeAnimation(): void {
    this.isLanguageChanging = false;
    if (this.languageAnimTimer) {
      clearTimeout(this.languageAnimTimer);
    }

    setTimeout(() => {
      this.isLanguageChanging = true;
      this.languageAnimTimer = setTimeout(() => {
        this.isLanguageChanging = false;
      }, 320);
    });
  }

  private applyTheme(theme: ThemeMode, persist = true): void {
    this.currentTheme = theme;
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.removeClass(document.body, 'theme-light');
      this.renderer.removeClass(document.body, 'theme-dark');
      this.renderer.addClass(document.body, theme === 'dark' ? 'theme-dark' : 'theme-light');
    }

    if (persist && isPlatformBrowser(this.platformId)) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }

  private extractDriveFileId(url: string): string | null {
    const byPath = url.match(/\/file\/d\/([^/]+)/)?.[1];
    if (byPath) {
      return byPath;
    }

    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('id');
    } catch {
      return null;
    }
  }
}
