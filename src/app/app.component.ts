import { Component, ElementRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './services/api.service';
import { PopupService } from './services/popup.service';
import { LoaderService } from './services/loader.service';
import { TranslateService } from './services/translate.service';
import { PopupComponent } from './shared/components/popup/popup.component';
import { GlobalLoaderComponent } from './shared/components/global-loader/global-loader.component';
import { TranslatePipe } from './pipes/translate.pipe';
import { Language, PortfolioBasic, Project, ProjectDetailsResponse, Section, TranslationKeyValue } from './interfaces';
import { AboutSectionComponent } from './sections/about-section/about-section.component';
import { ExperienceSectionComponent } from './sections/experience-section/experience-section.component';
import { ProjectsSectionComponent } from './sections/projects-section/projects-section.component';
import { SkillsMinimalSectionComponent } from './sections/skills-minimal-section/skills-minimal-section.component';
import { ContactCtaSectionComponent } from './sections/contact-cta-section/contact-cta-section.component';
import { TestimonialsSectionComponent } from './sections/testimonials-section/testimonials-section.component';
import { ProjectDetailsPageComponent } from './sections/project-details-page/project-details-page.component';
import {
  BASIC_DETAILS_FALLBACK,
  DEFAULT_PORTFOLIO_ID,
  DEFAULT_THEME_MODE,
  LANGUAGE_OPTIONS,
  LanguageOption,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY
} from './constants/constant';

type ThemeMode = 'light' | 'dark';
type RenderableSectionType = 'about' | 'skills' | 'projects' | 'experience' | 'testimonials' | 'contact';

interface RenderableSection {
  type: RenderableSectionType;
  heading: string;
  menuLabel: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  sectionType: string | null;
  trackKey: string;
  anchorId: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    PopupComponent,
    GlobalLoaderComponent,
    TranslatePipe,
    AboutSectionComponent,
    SkillsMinimalSectionComponent,
    ProjectsSectionComponent,
    ExperienceSectionComponent,
    ContactCtaSectionComponent,
    TestimonialsSectionComponent,
    ProjectDetailsPageComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';
  portfolioId = DEFAULT_PORTFOLIO_ID;
  isBasicLoading = true;
  basicDetails: PortfolioBasic = {
    ...BASIC_DETAILS_FALLBACK,
    fullName: '',
    shortForm: '',
    role: '',
    openToWork: false,
    openToWorkDescription: '',
    headline: '',
    subheadline: '',
    aboutMe: '',
    totalExperience: null,
    currentCompany: '',
    email: '',
    phoneNumber: '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    resumeUrl: '',
    profileImageUrl: ''
  };
  sections: Section[] = [];
  isSectionsLoading = true;
  isMenuOpen = false;
  isLanguageMenuOpen = false;
  currentTheme: ThemeMode = DEFAULT_THEME_MODE;
  currentLanguageCode = 'EN';
  isLanguageChanging = false;
  isProfileCompressed = false;
  isDesktopProfileMode = false;
  headlineLines: string[] = [];
  displayedHeadlineLines: string[] = [];
  displayedRoleText = '';
  activeProjectSlug: string | null = null;
  activeProject: Project | null = null;
  activeProjectDetails: ProjectDetailsResponse | null = null;
  isProjectDetailsLoading = false;
  projectDetailsError = '';
  languageOptions: LanguageOption[] = [...LANGUAGE_OPTIONS];
  private readonly apiService = inject(ApiService);
  private readonly popupService = inject(PopupService);
  private readonly loaderService = inject(LoaderService);
  private readonly translateService = inject(TranslateService);
  private readonly renderer = inject(Renderer2);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private profileImageIndex = 0;
  private languageAnimTimer: ReturnType<typeof setTimeout> | null = null;
  private headlineStartTimer: ReturnType<typeof setTimeout> | null = null;
  private headlineFrameId: number | null = null;
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private profileCompressTimer: ReturnType<typeof setTimeout> | null = null;
  private profileFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private roleTypingFrameId: number | null = null;
  private readonly projectDetailsCache = new Map<number, ProjectDetailsResponse>();
  isProfileFadingOut = false;

  ngOnInit() {
    this.activeProjectSlug = this.readProjectSlugFromPath();
    this.initializeTheme();
    this.initializeLanguage();
    this.translateService.setLanguage(this.currentLanguageCode);
    this.loadTranslationsForLanguage(this.currentLanguageCode);
    this.loadLanguageOptions();
    this.updateProfileIslandMode();
    this.startHeadlineAnimation();
    this.loaderService.show({ label: 'Loading profile...', signature: 'MN' });

    this.apiService.getPortfolioBasic(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.basicDetails = data;
      this.portfolioId = data.id || DEFAULT_PORTFOLIO_ID;
      this.isBasicLoading = false;
      this.loaderService.hide();
      this.profileImageIndex = 0;
      this.startRoleTypingAnimation();
      this.startHeadlineAnimation();
      if (this.activeProjectSlug) {
        this.resolveProjectDetailsBySlug(this.activeProjectSlug, this.portfolioId);
      }
    }, error => {
      console.error('Error fetching basic details:', error);
      this.isBasicLoading = false;
      this.loaderService.hide();
      this.popupService.failure('Failed to load profile details. Please try again.');
    });

    this.apiService.getSectionsByPortfolioId(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.sections = data
        .filter(section => section.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      this.isSectionsLoading = false;
    }, error => {
      console.error('Error fetching sections:', error);
      this.popupService.failure('Unable to load menu sections right now.');
      this.isSectionsLoading = false;
    });

  }

  ngOnDestroy(): void {
    if (this.languageAnimTimer) {
      clearTimeout(this.languageAnimTimer);
    }
    if (this.headlineStartTimer) {
      clearTimeout(this.headlineStartTimer);
    }
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    if (this.profileCompressTimer) {
      clearTimeout(this.profileCompressTimer);
    }
    if (this.profileFadeTimer) {
      clearTimeout(this.profileFadeTimer);
    }
    if (this.roleTypingFrameId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.roleTypingFrameId);
    }
    if (this.headlineFrameId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.headlineFrameId);
    }
    this.loaderService.hide();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const clickedInsideLanguageMenu = !!target.closest('.language-wrap');
    const clickedInsideSectionsMenu = !!target.closest('.menu-island');

    if (!clickedInsideLanguageMenu) {
      this.isLanguageMenuOpen = false;
    }

    if (!clickedInsideSectionsMenu) {
      this.isMenuOpen = false;
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
    this.loadTranslationsForLanguage(code);
    this.startHeadlineAnimation();
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
  }

  onSectionMenuSelect(anchorId: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.isMenuOpen = false;

    if (this.isProjectDetailsRoute) {
      this.goToHomeFromDetails();
      this.scrollToSectionAnchorWhenReady(anchorId);
      return;
    }

    this.scrollToSectionAnchorWhenReady(anchorId);
  }

  onProfileBubbleClick(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isMenuOpen = false;
    this.isLanguageMenuOpen = false;

    if (this.isProjectDetailsRoute) {
      this.goToHomeFromDetails();
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
      }
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get sectionMenuItems(): Array<{ label: string; anchorId: string }> {
    return this.renderableSections.map(section => ({
      label: section.menuLabel,
      anchorId: section.anchorId
    }));
  }

  get renderableSections(): RenderableSection[] {
    const mapped = this.sections
      .map((section) => {
        const type = this.resolveRenderableSectionType(section.sectionKey);
        if (!type) {
          return null;
        }

        const fallbackHeading = type === 'projects'
          ? 'My Projects'
          : type === 'experience'
            ? 'Experience'
            : type === 'about'
              ? 'About Me'
              : type === 'testimonials'
                ? 'Testimonials'
                : type === 'contact'
                  ? "Let's Connect"
            : 'Skills & Tools';
        const heading = (section.subtitle || '').trim() || fallbackHeading;
        const menuLabel = (section.title || '').trim() || heading;
        const description = (section.description || '').trim();
        const buttonText = (section.buttonText || '').trim();
        const buttonUrl = (section.buttonUrl || '').trim();
        const sectionType = section.sectionType;

        return {
          type,
          heading,
          menuLabel,
          description,
          buttonText,
          buttonUrl,
          sectionType,
          trackKey: `${section.sectionKey}-${section.displayOrder}`,
          anchorId: `section-${type}-${section.displayOrder}`
        } satisfies RenderableSection;
      })
      .filter((section): section is RenderableSection => section !== null);

    if (mapped.length > 0) {
      return mapped;
    }

    return [
      { type: 'about', heading: 'About Me', menuLabel: 'About Me', description: '', buttonText: '', buttonUrl: '', sectionType: null, trackKey: 'about-fallback', anchorId: 'section-about-fallback' },
      { type: 'skills', heading: 'Skills & Tools', menuLabel: 'Skills & Tools', description: '', buttonText: '', buttonUrl: '', sectionType: 'cards', trackKey: 'skills-fallback', anchorId: 'section-skills-fallback' },
      { type: 'projects', heading: 'My Projects', menuLabel: 'My Projects', description: '', buttonText: '', buttonUrl: '', sectionType: 'cards', trackKey: 'projects-fallback', anchorId: 'section-projects-fallback' },
      { type: 'experience', heading: 'Experience', menuLabel: 'Experience', description: '', buttonText: '', buttonUrl: '', sectionType: null, trackKey: 'experience-fallback', anchorId: 'section-experience-fallback' },
      { type: 'testimonials', heading: 'Testimonials', menuLabel: 'Testimonials', description: '', buttonText: '', buttonUrl: '', sectionType: 'cards', trackKey: 'testimonials-fallback', anchorId: 'section-testimonials-fallback' },
      { type: 'contact', heading: 'Let\'s Connect', menuLabel: 'Let\'s Connect', description: '', buttonText: 'Get in touch', buttonUrl: '', sectionType: null, trackKey: 'contact-fallback', anchorId: 'section-contact-fallback' }
    ];
  }

  get normalizedFullName(): string {
    return (this.basicDetails.fullName || '').trim();
  }

  get translatedFullName(): string {
    const rawName = (this.basicDetails.fullName || '').trim();
    return this.translateService.translate(rawName).trim();
  }

  get derivedShortForm(): string {
    const explicitShort = (this.basicDetails.shortForm || '').trim();
    if (explicitShort) {
      return explicitShort.slice(0, 2).toUpperCase();
    }

    const name = this.normalizedFullName;
    if (!name) {
      return 'ME';
    }

    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
    }

    return words[0].slice(0, 2).toUpperCase();
  }

  get nameLeadLetter(): string {
    return this.translatedFullName.charAt(0) || this.derivedShortForm.charAt(0) || 'M';
  }

  get nameRest(): string {
    return this.translatedFullName.slice(1);
  }

  get compactSuffixLetter(): string {
    return this.derivedShortForm.slice(1, 2);
  }

  get openToWorkText(): string {
    return (this.basicDetails.openToWorkDescription || '').trim();
  }

  get roleDisplayText(): string {
    if (!this.isDesktopProfileMode) {
      return this.basicDetails.role || 'Developer';
    }
    return this.displayedRoleText;
  }

  get isProjectDetailsRoute(): boolean {
    return !!this.activeProjectSlug;
  }

  get footerYear(): number {
    return new Date().getFullYear();
  }

  get footerOwnerName(): string {
    return (this.basicDetails.fullName || '').trim() || 'Manoj N';
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
    const hasEnglish = this.languageOptions.some(option => option.code === 'EN');
    this.currentLanguageCode = hasEnglish ? 'EN' : (this.languageOptions[0]?.code ?? 'EN');
  }

  private loadLanguageOptions(): void {
    this.apiService.getLanguages(false).subscribe({
      next: (languages: Language[]) => {
        const mappedOptions = languages
          .map(item => ({
            code: (item.languageCode || '').trim().toUpperCase(),
            label: (item.language || '').trim()
          }))
          .filter(item => !!item.code && !!item.label);

        if (mappedOptions.length === 0) {
          console.warn('Languages API returned an empty list. Keeping fallback language options.');
          return;
        }

        const englishOptions = mappedOptions.filter(option => option.code === 'EN');
        const nonEnglishOptions = mappedOptions.filter(option => option.code !== 'EN');
        this.languageOptions = [...englishOptions, ...nonEnglishOptions];
        this.syncLanguageSelectionWithOptions();
      },
      error: (error) => {
        console.error('Error fetching languages:', error);
        this.popupService.failure('Unable to load languages from API. Showing default language options.');
      }
    });
  }

  private syncLanguageSelectionWithOptions(): void {
    const hasEnglish = this.languageOptions.some(option => option.code === 'EN');
    const selectedCode = hasEnglish ? 'EN' : (this.languageOptions[0]?.code ?? 'EN');

    this.currentLanguageCode = selectedCode;
    this.translateService.setLanguage(selectedCode);
    this.loadTranslationsForLanguage(selectedCode);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedCode);
    }
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

  private loadTranslationsForLanguage(languageCode: string): void {
    const normalizedCode = (languageCode || '').trim().toUpperCase();
    if (!normalizedCode || normalizedCode === 'EN') {
      return;
    }

    this.apiService.getTranslationsByLanguageCode(normalizedCode).subscribe({
      next: (translations: TranslationKeyValue[]) => {
        const entries = translations
          .map(item => ({
            key: (item.translationKey || '').trim(),
            value: (item.translationValue || '').trim()
          }))
          .filter(item => !!item.key && !!item.value);

        if (entries.length === 0) {
          console.warn(`No translations returned for language ${normalizedCode}.`);
          return;
        }

        this.translateService.updateFromApi(normalizedCode, entries);
        this.startHeadlineAnimation();
      },
      error: (error) => {
        console.error(`Error fetching translations for ${normalizedCode}:`, error);
        this.popupService.failure(`Unable to load ${normalizedCode} translations from API.`);
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    this.resizeDebounceTimer = setTimeout(() => {
      this.updateProfileIslandMode();
      this.reflowHeadlineWithoutAnimation();
    }, 150);
  }

  @HostListener('window:popstate')
  onWindowPopState(): void {
    const slug = this.readProjectSlugFromPath();
    if (!slug) {
      this.clearProjectDetailsState();
      return;
    }

    this.activeProjectSlug = slug;
    this.resolveProjectDetailsBySlug(slug, this.portfolioId || DEFAULT_PORTFOLIO_ID);
  }

  onProfileHoverEnter(): void {
    if (!this.isDesktopHoverMode()) {
      return;
    }

    if (this.profileCompressTimer) {
      clearTimeout(this.profileCompressTimer);
    }
    if (this.profileFadeTimer) {
      clearTimeout(this.profileFadeTimer);
    }

    this.isProfileFadingOut = false;
    this.isProfileCompressed = false;
    this.displayedRoleText = this.basicDetails.role || 'Developer';
  }

  onProfileHoverLeave(): void {
    if (!this.isDesktopHoverMode()) {
      return;
    }

    this.scheduleProfileCompression(2000);
  }

  get translatedHeadline(): string {
    return this.translateService.translate(this.basicDetails.headline || '');
  }

  private startHeadlineAnimation(): void {
    const headline = this.translatedHeadline.trim();
    this.headlineLines = [];
    this.displayedHeadlineLines = [];

    if (!headline) {
      return;
    }

    this.headlineLines = this.splitHeadlineIntoLines(headline);
    this.displayedHeadlineLines = this.headlineLines.map(() => '');

    if (!isPlatformBrowser(this.platformId)) {
      this.displayedHeadlineLines = [...this.headlineLines];
      return;
    }

    if (this.headlineStartTimer) {
      clearTimeout(this.headlineStartTimer);
    }
    if (this.headlineFrameId !== null) {
      cancelAnimationFrame(this.headlineFrameId);
      this.headlineFrameId = null;
    }

    const lines = [...this.headlineLines];
    const typingDelayMs = 24;
    const linePauseMs = 260;
    const initialDelayMs = 220;
    let lineIndex = 0;
    let charIndex = 0;
    let lastTick = 0;

    const animate = (now: number): void => {
      if (lineIndex >= lines.length) {
        this.headlineFrameId = null;
        return;
      }

      if (lastTick === 0) {
        lastTick = now;
      }

      const elapsed = now - lastTick;
      const steps = Math.floor(elapsed / typingDelayMs);
      if (steps <= 0) {
        this.headlineFrameId = requestAnimationFrame(animate);
        return;
      }

      lastTick += steps * typingDelayMs;
      const currentLine = lines[lineIndex];
      charIndex = Math.min(currentLine.length, charIndex + steps);

      const nextRendered = [...this.displayedHeadlineLines];
      nextRendered[lineIndex] = currentLine.slice(0, charIndex);
      this.displayedHeadlineLines = nextRendered;

      if (charIndex >= currentLine.length) {
        lineIndex += 1;
        charIndex = 0;
        lastTick += linePauseMs;
      }

      this.headlineFrameId = requestAnimationFrame(animate);
    };

    this.headlineStartTimer = setTimeout(() => {
      this.headlineFrameId = requestAnimationFrame(animate);
    }, initialDelayMs);
  }

  private reflowHeadlineWithoutAnimation(): void {
    const headline = this.translatedHeadline.trim();
    if (!headline) {
      this.headlineLines = [];
      this.displayedHeadlineLines = [];
      return;
    }

    this.headlineLines = this.splitHeadlineIntoLines(headline);
    this.displayedHeadlineLines = [...this.headlineLines];
  }

  private updateProfileIslandMode(): void {
    this.isDesktopProfileMode = this.isDesktopHoverMode();
    if (!this.isDesktopProfileMode) {
      this.isProfileCompressed = false;
      this.isProfileFadingOut = false;
      if (this.profileCompressTimer) {
        clearTimeout(this.profileCompressTimer);
      }
      if (this.profileFadeTimer) {
        clearTimeout(this.profileFadeTimer);
      }
      this.displayedRoleText = this.basicDetails.role || 'Developer';
      return;
    }

    this.isProfileCompressed = false;
    this.isProfileFadingOut = false;
    this.displayedRoleText = this.basicDetails.role || 'Developer';
    this.scheduleProfileCompression(5000);
  }

  private scheduleProfileCompression(delayMs: number): void {
    if (this.profileCompressTimer) {
      clearTimeout(this.profileCompressTimer);
    }
    if (this.profileFadeTimer) {
      clearTimeout(this.profileFadeTimer);
    }

    this.profileCompressTimer = setTimeout(() => {
      if (this.isProfileCompressed) {
        return;
      }
      this.isProfileFadingOut = true;

      this.profileFadeTimer = setTimeout(() => {
        this.isProfileFadingOut = false;
        this.isProfileCompressed = true;
      }, 650);
    }, delayMs);
  }

  private isDesktopHoverMode(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth > 768;
  }

  private startRoleTypingAnimation(): void {
    const role = this.basicDetails.role || 'Developer';
    this.displayedRoleText = this.isProfileCompressed ? '' : role;
  }

  private resolveRenderableSectionType(sectionKey: string | null): RenderableSectionType | null {
    const normalized = (sectionKey || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized.includes('skill')) {
      return 'skills';
    }

    if (normalized.includes('project')) {
      return 'projects';
    }

    if (normalized.includes('experience')) {
      return 'experience';
    }

    if (normalized.includes('about')) {
      return 'about';
    }

    if (normalized.includes('testimonial') || (normalized.includes('social') && normalized.includes('proof'))) {
      return 'testimonials';
    }

    if (normalized.includes('contact') || normalized.includes('cta')) {
      return 'contact';
    }

    return null;
  }

  private splitHeadlineIntoLines(text: string): string[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [text];
    }

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 2) {
      return [text];
    }

    const width = window.innerWidth;
    const targetLines = width <= 560 ? 4 : width <= 960 ? 3 : 2;
    const targetCharsPerLine = Math.ceil((text.length / targetLines) * 1.22);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= targetCharsPerLine || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return this.balanceHeadlineLines(lines);
  }

  private balanceHeadlineLines(lines: string[]): string[] {
    const normalized = lines.map(line => line.trim()).filter(Boolean);
    if (normalized.length < 2) {
      return normalized;
    }

    const wordCount = (line: string): number => line.split(/\s+/).filter(Boolean).length;
    const tail = () => normalized[normalized.length - 1];
    const prev = () => normalized[normalized.length - 2];

    // Merge awkward tail lines like "business" + "impact."
    while (normalized.length >= 2 && wordCount(tail()) === 1 && wordCount(prev()) <= 2) {
      normalized[normalized.length - 2] = `${prev()} ${tail()}`.trim();
      normalized.pop();
    }

    // If final line is still a single word, pull one word from previous line.
    if (normalized.length >= 2 && wordCount(tail()) === 1) {
      const prevWords = prev().split(/\s+/).filter(Boolean);
      if (prevWords.length >= 2) {
        const movedWord = prevWords.pop();
        if (movedWord) {
          normalized[normalized.length - 2] = prevWords.join(' ');
          normalized[normalized.length - 1] = `${movedWord} ${tail()}`.trim();
        }
      }
    }

    return normalized;
  }

  private applyTheme(theme: ThemeMode, persist = true): void {
    this.currentTheme = theme;
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.removeClass(document.body, 'theme-light');
      this.renderer.removeClass(document.body, 'theme-dark');
      this.renderer.addClass(document.body, theme === 'dark' ? 'theme-dark' : 'theme-light');
      this.renderer.removeClass(document.documentElement, 'theme-light');
      this.renderer.removeClass(document.documentElement, 'theme-dark');
      this.renderer.addClass(document.documentElement, theme === 'dark' ? 'theme-dark' : 'theme-light');
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

  onProjectViewDetails(project: Project): void {
    const slug = this.createProjectSlug(project);
    this.activeProjectSlug = slug;
    this.navigateToPath(`/${encodeURIComponent(slug)}`);
    this.loadProjectDetails(project);
  }

  goToHomeFromDetails(): void {
    this.clearProjectDetailsState();
    this.navigateToPath('/');
  }

  private clearProjectDetailsState(): void {
    this.activeProjectSlug = null;
    this.activeProject = null;
    this.activeProjectDetails = null;
    this.projectDetailsError = '';
    this.isProjectDetailsLoading = false;
  }

  private resolveProjectDetailsBySlug(slug: string, portfolioId: number): void {
    this.isProjectDetailsLoading = true;
    this.projectDetailsError = '';
    this.activeProjectDetails = null;

    this.apiService.getPortfolioProjects(portfolioId).subscribe({
      next: (projects) => {
        const matched = projects.find(project => this.matchesProjectSlug(project, slug)) ?? null;
        if (!matched) {
          this.activeProject = null;
          this.isProjectDetailsLoading = false;
          this.projectDetailsError = 'Project not found.';
          return;
        }

        this.loadProjectDetails(matched);
      },
      error: (error) => {
        console.error('Error resolving project by slug:', error);
        this.activeProject = null;
        this.activeProjectDetails = null;
        this.isProjectDetailsLoading = false;
        this.projectDetailsError = 'Unable to load project right now.';
      }
    });
  }

  private loadProjectDetails(project: Project): void {
    this.activeProject = project;
    this.projectDetailsError = '';

    const cached = this.projectDetailsCache.get(project.id);
    if (cached) {
      this.activeProjectDetails = cached;
      this.isProjectDetailsLoading = false;
      return;
    }

    this.isProjectDetailsLoading = true;
    this.activeProjectDetails = null;

    this.apiService.getPortfolioProjectDetails(project.id).subscribe({
      next: (details) => {
        this.projectDetailsCache.set(project.id, details);
        this.activeProjectDetails = details;
        this.isProjectDetailsLoading = false;
      },
      error: (error) => {
        console.error('Error fetching project details:', error);
        this.activeProjectDetails = null;
        this.isProjectDetailsLoading = false;
        this.projectDetailsError = 'Project details API not connected yet. Showing summary for now.';
      }
    });
  }

  private createProjectSlug(project: Project): string {
    const primary = (project.projectKey || '').trim() || (project.title || '').trim() || `project-${project.id}`;
    const slug = this.toSlug(primary);
    return slug || `project-${project.id}`;
  }

  private matchesProjectSlug(project: Project, slug: string): boolean {
    const target = this.toSlug(slug);
    const byKey = this.toSlug((project.projectKey || '').trim());
    const byTitle = this.toSlug((project.title || '').trim());
    return target === byKey || target === byTitle;
  }

  private toSlug(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private readProjectSlugFromPath(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path || path.toLowerCase() === 'index.html') {
      return null;
    }

    return decodeURIComponent(path);
  }

  private navigateToPath(path: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.history.pushState({}, '', path);
  }

  private scrollToSectionAnchor(anchorId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = document.getElementById(anchorId);
    if (!target) {
      return;
    }

    const offsetTop = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({
      top: Math.max(0, offsetTop),
      behavior: 'smooth'
    });
  }

  private scrollToSectionAnchorWhenReady(anchorId: string, retries = 20): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = document.getElementById(anchorId);
    if (target) {
      this.scrollToSectionAnchor(anchorId);
      return;
    }

    if (retries <= 0) {
      return;
    }

    setTimeout(() => this.scrollToSectionAnchorWhenReady(anchorId, retries - 1), 80);
  }
}


