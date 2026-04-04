import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Project, TechnologyItem } from '../../interfaces';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-projects-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './projects-section.component.html',
  styleUrl: './projects-section.component.css'
})
export class ProjectsSectionComponent implements OnChanges {
  @Input() heading = '';
  @Input() portfolioId!: number;
  @Input() sectionType: string | null = null;
  @Output() viewDetailsRequested = new EventEmitter<Project>();

  @ViewChild('carouselViewport') private carouselViewport?: ElementRef<HTMLElement>;

  projects: Project[] = [];
  isLoading = false;
  loadError = '';
  canScrollLeft = false;
  canScrollRight = false;
  scrollProgress = 0;
  focusedProjectId: number | null = null;
  private readonly imageVariantIndex = new Map<number, number>();

  private readonly apiService = inject(ApiService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId']?.currentValue) {
      this.fetchProjects(changes['portfolioId'].currentValue);
    }
  }

  get normalizedSectionType(): 'cards' | 'grid' | 'timeline' | 'moving cards' {
    const raw = (this.sectionType || '').trim().toLowerCase();
    if (raw === 'grid' || raw === 'timeline' || raw === 'moving cards' || raw === 'cards') {
      return raw;
    }
    return 'cards';
  }

  get movingProjects(): Project[] {
    if (this.projects.length === 0) {
      return [];
    }
    return [...this.projects, ...this.projects];
  }

  previous(): void {
    this.scrollByCards(-1);
  }

  next(): void {
    this.scrollByCards(1);
  }

  onViewportScroll(): void {
    this.updateNavState();
  }

  onViewDetails(project: Project): void {
    this.viewDetailsRequested.emit(project);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateNavState();
  }

  private fetchProjects(portfolioId: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.getPortfolioProjects(portfolioId).subscribe({
      next: (data) => {
        this.projects = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
        this.imageVariantIndex.clear();
        this.focusedProjectId = this.projects[0]?.id ?? null;
        this.isLoading = false;
        setTimeout(() => this.updateNavState());
      },
      error: (error) => {
        console.error('Error fetching projects:', error);
        this.projects = [];
        this.loadError = 'Unable to load projects right now.';
        this.isLoading = false;
        this.canScrollLeft = false;
        this.canScrollRight = false;
        this.scrollProgress = 0;
        this.focusedProjectId = null;
      }
    });
  }

  getProjectImageSrc(project: Project): string | null {
    const rawUrl = project.imageUrl;
    if (!rawUrl) {
      return null;
    }

    const fileId = this.extractDriveFileId(rawUrl);
    if (!fileId) {
      return rawUrl;
    }

    const candidates = this.getDriveImageCandidates(fileId);
    const currentIndex = this.imageVariantIndex.get(project.id) ?? 0;
    return candidates[currentIndex] ?? candidates[0] ?? null;
  }

  onProjectImageError(projectId: number): void {
    const current = this.imageVariantIndex.get(projectId) ?? 0;
    this.imageVariantIndex.set(projectId, current + 1);
  }

  getTechnologyTextColor(item: TechnologyItem): string {
    const normalized = this.normalizeHexColor(item.color);
    return normalized ?? 'color-mix(in srgb, var(--text-color) 78%, transparent)';
  }

  getTechnologyBackgroundColor(item: TechnologyItem): string {
    const rgb = this.hexToRgb(this.normalizeHexColor(item.color));
    if (!rgb) {
      return 'color-mix(in srgb, var(--text-color) 12%, transparent)';
    }

    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
  }

  private scrollByCards(direction: 1 | -1): void {
    const viewport = this.carouselViewport?.nativeElement;
    if (!viewport) {
      return;
    }

    const card = viewport.querySelector<HTMLElement>('.project-card');
    const step = card ? card.getBoundingClientRect().width + 16 : 320;

    viewport.scrollBy({
      left: direction * step,
      behavior: 'smooth'
    });
  }

  private updateNavState(): void {
    const viewport = this.carouselViewport?.nativeElement;
    if (!viewport) {
      this.canScrollLeft = false;
      this.canScrollRight = false;
      this.scrollProgress = 0;
      return;
    }

    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const scrollLeft = viewport.scrollLeft;
    const epsilon = 2;

    this.canScrollLeft = scrollLeft > epsilon;
    this.canScrollRight = scrollLeft < maxScrollLeft - epsilon;
    this.scrollProgress = maxScrollLeft > 0
      ? Math.min(100, Math.max(0, (scrollLeft / maxScrollLeft) * 100))
      : 0;
    this.updateFocusedProject(viewport);
  }

  private updateFocusedProject(viewport: HTMLElement): void {
    const cards = Array.from(viewport.querySelectorAll<HTMLElement>('.project-card[data-project-id]'));
    if (cards.length === 0) {
      this.focusedProjectId = null;
      return;
    }

    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    let nearestId: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const card of cards) {
      const id = Number(card.dataset['projectId']);
      if (!Number.isFinite(id)) {
        continue;
      }

      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = id;
      }
    }

    this.focusedProjectId = nearestId;
  }

  private getDriveImageCandidates(fileId: string): string[] {
    return [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];
  }

  private extractDriveFileId(url: string): string | null {
    const byPath = url.match(/\/file\/d\/([^/]+)/)?.[1];
    if (byPath) {
      return byPath;
    }

    try {
      const parsed = new URL(url);
      const byQuery = parsed.searchParams.get('id');
      if (byQuery) {
        return byQuery;
      }

      const parts = parsed.pathname.split('/').filter(Boolean);
      const openIdIndex = parts.findIndex(part => part.toLowerCase() === 'd');
      if (openIdIndex >= 0 && parts[openIdIndex + 1]) {
        return parts[openIdIndex + 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  private normalizeHexColor(color: string | null): string | null {
    if (!color) {
      return null;
    }

    const trimmed = color.trim();
    if (!trimmed.startsWith('#')) {
      return null;
    }

    const hex = trimmed.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      return `#${hex.split('').map(char => `${char}${char}`).join('')}`;
    }

    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return `#${hex}`;
    }

    return null;
  }

  private hexToRgb(hexColor: string | null): { r: number; g: number; b: number } | null {
    if (!hexColor) {
      return null;
    }

    const value = hexColor.slice(1);
    if (value.length !== 6) {
      return null;
    }

    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);

    if ([r, g, b].some(Number.isNaN)) {
      return null;
    }

    return { r, g, b };
  }
}
