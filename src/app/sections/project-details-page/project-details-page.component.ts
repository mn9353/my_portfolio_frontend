import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { Project, ProjectDetailMedia, ProjectDetailsResponse, Skill, TechnologyItem } from '../../interfaces';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-project-details-page',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './project-details-page.component.html',
  styleUrl: './project-details-page.component.css'
})
export class ProjectDetailsPageComponent implements OnChanges {
  @Input() project: Project | null = null;
  @Input() details: ProjectDetailsResponse | null = null;
  @Input() isLoading = false;
  @Input() error = '';
  @Output() backRequested = new EventEmitter<void>();

  private readonly mediaVariantIndex = new Map<number, number>();
  private readonly failedMediaIds = new Set<number>();
  private readonly techMetaByName = new Map<string, { logoUrl: string | null; shortForm: string | null }>();
  private readonly failedTechNames = new Set<string>();
  private readonly apiService = inject(ApiService);

  onBack(): void {
    this.backRequested.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['details']) {
      this.mediaVariantIndex.clear();
      this.failedMediaIds.clear();
    }

    if (changes['project']?.currentValue) {
      this.fetchSkillLogos();
    }
  }

  get groupedPoints(): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    const points = this.details?.points ?? [];

    for (const point of points) {
      const type = (point.pointType || 'Highlights').trim();
      const key = type.charAt(0).toUpperCase() + type.slice(1);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(point.content);
    }

    return groups;
  }

  get orderedPointKeys(): string[] {
    return Object.keys(this.groupedPoints);
  }

  get visibleMedia(): ProjectDetailMedia[] {
    const normalized = (this.details?.media ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
    if (normalized.length > 0) {
      return normalized;
    }

    const fallback = (this.project?.imageUrl || '').trim();
    if (!fallback) {
      return [];
    }

    return [{
      id: -1,
      projectId: this.project?.id ?? 0,
      mediaType: 'image',
      mediaUrl: fallback,
      caption: null,
      isCover: true,
      displayOrder: 1
    }];
  }

  get heroMedia(): ProjectDetailMedia | null {
    return this.visibleMedia[0] ?? null;
  }

  get galleryMedia(): ProjectDetailMedia[] {
    return this.visibleMedia.slice(1);
  }

  get visibleLinks() {
    const ordered = (this.details?.links ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
    const merged = [...ordered];

    if (this.project?.githubUrl) {
      merged.push({ id: -101, projectId: this.project.id, label: 'GitHub', url: this.project.githubUrl, displayOrder: 999 });
    }
    if (this.project?.liveUrl) {
      merged.push({ id: -102, projectId: this.project.id, label: 'Live Demo', url: this.project.liveUrl, displayOrder: 1000 });
    }

    const seen = new Set<string>();
    return merged.filter(item => {
      const key = (item.url || '').trim().toLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  get durationText(): string {
    const start = this.details?.details?.durationStart;
    const end = this.details?.details?.durationEnd;
    const isCurrent = this.details?.details?.isCurrent;

    if (!start && !end) {
      return '';
    }

    const from = this.formatMonthYear(start);
    const to = isCurrent ? 'Present' : this.formatMonthYear(end);

    if (!from && !to) {
      return '';
    }

    if (from && to) {
      return `${from} - ${to}`;
    }

    return from || to;
  }

  get normalizedTechnologies(): TechnologyItem[] {
    const list = this.project?.technologiesUsed ?? [];
    return list
      .map((item) => {
        const name = (item?.technology || '').trim();
        const fromProject = (item?.logoUrl || '').trim() || null;
        const fromSkills = this.findSkillMeta(name);
        const fromSkillsLogo = (fromSkills?.logoUrl || '').trim() || null;
        return {
          technology: name,
          color: item?.color ?? null,
          logoUrl: fromProject || fromSkillsLogo
        } satisfies TechnologyItem;
      })
      .filter(item => !!item.technology);
  }

  getMediaSrc(media: ProjectDetailMedia): string | null {
    if (this.failedMediaIds.has(media.id)) {
      return null;
    }

    const raw = (media.mediaUrl || '').trim();
    if (!raw) {
      return null;
    }

    const fileId = this.extractDriveFileId(raw);
    if (!fileId) {
      return raw;
    }

    const variants = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w2200`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];

    const index = this.mediaVariantIndex.get(media.id) ?? 0;
    return variants[index] ?? variants[0] ?? null;
  }

  onMediaError(media: ProjectDetailMedia): void {
    const current = this.mediaVariantIndex.get(media.id) ?? 0;
    const next = current + 1;
    if (next >= 3) {
      this.failedMediaIds.add(media.id);
      return;
    }

    this.mediaVariantIndex.set(media.id, next);
  }

  getTechLogoSrc(item: TechnologyItem): string | null {
    const nameKey = (item.technology || '').trim().toLowerCase();
    if (!nameKey || this.failedTechNames.has(nameKey)) {
      return null;
    }

    const rawValue = (item.logoUrl || '').trim();
    if (!rawValue) {
      return null;
    }

    const raw = this.extractImageSource(rawValue);
    if (!raw) {
      return null;
    }

    const fileId = this.extractDriveFileId(raw);
    if (!fileId) {
      return raw;
    }

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }

  onTechLogoError(item: TechnologyItem): void {
    const key = (item.technology || '').trim().toLowerCase();
    if (!key) {
      return;
    }
    this.failedTechNames.add(key);
  }

  getTechShortForm(item: TechnologyItem): string {
    const name = (item.technology || '').trim();
    const fromSkills = this.findSkillMeta(name)?.shortForm?.trim();
    if (fromSkills) {
      return fromSkills.slice(0, 4).toUpperCase();
    }

    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
    }

    return (words[0] || 'SK').slice(0, 2).toUpperCase();
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

  private extractImageSource(rawValue: string): string | null {
    if (!rawValue) {
      return null;
    }

    if (rawValue.startsWith('<')) {
      const srcMatch = rawValue.match(/src\s*=\s*['"]([^'"]+)['"]/i);
      return srcMatch?.[1]?.trim() || null;
    }

    return rawValue;
  }

  private formatMonthYear(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private fetchSkillLogos(): void {
    const portfolioId = this.project?.portfolioId;
    if (!portfolioId) {
      return;
    }

    this.apiService.getPortfolioSkills(portfolioId).subscribe({
      next: (skills: Skill[]) => {
        this.techMetaByName.clear();
        for (const skill of skills) {
          const rawKey = (skill.skillName || '').trim();
          const key = this.normalizeTechKey(rawKey);
          if (key) {
            this.techMetaByName.set(key, {
              logoUrl: (skill.logoUrl || '').trim() || null,
              shortForm: (skill.shortForm || '').trim() || null
            });
          }
        }
      },
      error: () => {
        this.techMetaByName.clear();
      }
    });
  }

  private findSkillMeta(technologyName: string): { logoUrl: string | null; shortForm: string | null } | null {
    const directKey = this.normalizeTechKey(technologyName);
    if (!directKey) {
      return null;
    }

    const direct = this.techMetaByName.get(directKey);
    if (direct) {
      return direct;
    }

    return null;
  }

  private normalizeTechKey(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }
}
