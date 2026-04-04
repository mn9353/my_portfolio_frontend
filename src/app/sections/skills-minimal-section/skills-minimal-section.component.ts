import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Skill } from '../../interfaces';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface SkillCategoryGroup {
  category: string;
  items: Skill[];
}

@Component({
  selector: 'app-skills-minimal-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './skills-minimal-section.component.html',
  styleUrl: './skills-minimal-section.component.css'
})
export class SkillsMinimalSectionComponent implements OnChanges {
  @Input() heading = 'Skills & Tools';
  @Input() portfolioId!: number;
  @Input() sectionType: string | null = null;

  skillGroups: SkillCategoryGroup[] = [];
  isLoading = false;
  loadError = '';

  private readonly apiService = inject(ApiService);
  private readonly logoVariantIndex = new Map<number, number>();
  private readonly failedLogoIds = new Set<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId']?.currentValue) {
      this.fetchSkills(changes['portfolioId'].currentValue);
    }
  }

  get hasSkills(): boolean {
    return this.skillGroups.length > 0;
  }

  get normalizedSectionType(): 'cards' | 'grid' | 'timeline' | 'moving cards' {
    const raw = (this.sectionType || '').trim().toLowerCase();
    if (raw === 'grid' || raw === 'timeline' || raw === 'moving cards' || raw === 'cards') {
      return raw;
    }
    return 'cards';
  }

  get allSkills(): Skill[] {
    return this.skillGroups.flatMap(group => group.items);
  }

  get movingSkills(): Skill[] {
    if (this.allSkills.length === 0) {
      return [];
    }
    return [...this.allSkills, ...this.allSkills];
  }

  getSkillLogoSrc(skill: Skill): string | null {
    if (this.failedLogoIds.has(skill.id)) {
      return null;
    }

    const rawValue = (skill.logoUrl || '').trim();
    if (!rawValue) {
      return null;
    }

    const rawUrl = this.extractImageSource(rawValue);
    if (!rawUrl) {
      return null;
    }

    const fileId = this.extractDriveFileId(rawUrl);
    if (!fileId) {
      return rawUrl;
    }

    const variants = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w240`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];

    const index = this.logoVariantIndex.get(skill.id) ?? 0;
    return variants[index] ?? variants[0] ?? null;
  }

  onSkillLogoError(skillId: number): void {
    const skill = this.findSkillById(skillId);
    if (!skill) {
      this.failedLogoIds.add(skillId);
      return;
    }

    const rawValue = (skill.logoUrl || '').trim();
    const source = this.extractImageSource(rawValue);
    const fileId = source ? this.extractDriveFileId(source) : null;

    if (!fileId) {
      this.failedLogoIds.add(skillId);
      return;
    }

    const current = this.logoVariantIndex.get(skillId) ?? 0;
    const next = current + 1;
    const variantsCount = 3;
    if (next >= variantsCount) {
      this.failedLogoIds.add(skillId);
      return;
    }

    this.logoVariantIndex.set(skillId, next);
  }

  getSkillMonogram(skill: Skill): string {
    const short = (skill.shortForm || '').trim();
    if (short) {
      return short.slice(0, 3).toUpperCase();
    }

    const words = (skill.skillName || '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
    }

    return (words[0] || 'SK').slice(0, 2).toUpperCase();
  }

  private fetchSkills(portfolioId: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.getPortfolioSkills(portfolioId).subscribe({
      next: (skills) => {
        const visible = skills
          .filter(skill => skill.isVisible)
          .sort((a, b) => a.displayOrder - b.displayOrder);

        const buckets = new Map<string, Skill[]>();
        for (const skill of visible) {
          const category = this.normalizeCategory(skill.category);
          const current = buckets.get(category) ?? [];
          current.push(skill);
          buckets.set(category, current);
        }

        const categoryOrder = ['Frontend', 'Backend', 'Language', 'Database', 'Tools'];
        this.skillGroups = Array.from(buckets.entries())
          .sort(([left], [right]) => {
            const leftIndex = categoryOrder.findIndex(item => item.toLowerCase() === left.toLowerCase());
            const rightIndex = categoryOrder.findIndex(item => item.toLowerCase() === right.toLowerCase());
            if (leftIndex >= 0 && rightIndex >= 0) {
              return leftIndex - rightIndex;
            }
            if (leftIndex >= 0) {
              return -1;
            }
            if (rightIndex >= 0) {
              return 1;
            }
            return left.localeCompare(right);
          })
          .map(([category, items]) => ({ category, items }));

        this.logoVariantIndex.clear();
        this.failedLogoIds.clear();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching skills:', error);
        this.skillGroups = [];
        this.loadError = 'Unable to load skills right now.';
        this.isLoading = false;
      }
    });
  }

  private normalizeCategory(category: string | null): string {
    const normalized = (category || '').trim();
    return normalized || 'General';
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
      const dIndex = parts.findIndex(part => part.toLowerCase() === 'd');
      if (dIndex >= 0 && parts[dIndex + 1]) {
        return parts[dIndex + 1];
      }
      return null;
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

  private findSkillById(skillId: number): Skill | null {
    for (const group of this.skillGroups) {
      const found = group.items.find(item => item.id === skillId);
      if (found) {
        return found;
      }
    }
    return null;
  }
}
