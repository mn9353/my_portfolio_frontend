import { Component, ElementRef, HostListener, OnInit, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './services/api.service';
import { PortfolioBasic, Section } from './interfaces';
import {
  BASIC_DETAILS_FALLBACK,
  DEFAULT_PORTFOLIO_ID,
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY
} from './constants/constant';

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';
  basicDetails: PortfolioBasic = BASIC_DETAILS_FALLBACK;
  sections: Section[] = [];
  isMenuOpen = false;
  currentTheme: ThemeMode = DEFAULT_THEME_MODE;
  private readonly apiService = inject(ApiService);
  private readonly renderer = inject(Renderer2);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private profileImageIndex = 0;

  ngOnInit() {
    this.initializeTheme();

    this.apiService.getPortfolioBasic(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.basicDetails = data;
      this.profileImageIndex = 0;
    });

    this.apiService.getSectionsByPortfolioId(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.sections = data
        .filter(section => section.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isMenuOpen = false;
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  get themeButtonLabel(): string {
    return this.currentTheme === 'dark' ? 'Switch To Light' : 'Switch To Dark';
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
