import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Skill } from '../../interfaces';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface SkillCategoryGroup {
  category: string;
  items: Skill[];
}

@Component({
  selector: 'app-skills-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './skills-section.component.html',
  styleUrl: './skills-section.component.css'
})
export class SkillsSectionComponent implements OnChanges {
  @Input() heading = 'Skills & Tools';
  @Input() portfolioId!: number;

  skillGroups: SkillCategoryGroup[] = [];
  isLoading = false;
  loadError = '';

  private readonly apiService = inject(ApiService);
  private readonly logoVariantIndex = new Map<number, number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId']?.currentValue) {
      this.fetchSkills(changes['portfolioId'].currentValue);
    }
  }

  get hasSkills(): boolean {
    return this.skillGroups.some(group => group.items.length > 0);
  }

  getSkillLogoSrc(skill: Skill): string | null {
    const rawUrl = (skill.logoUrl || '').trim();
    if (!rawUrl) {
      return null;
    }

    const fileId = this.extractDriveFileId(rawUrl);
    if (!fileId) {
      return rawUrl;
    }

    const candidates = this.getDriveImageCandidates(fileId);
    const currentIndex = this.logoVariantIndex.get(skill.id) ?? 0;
    return candidates[currentIndex] ?? candidates[0] ?? null;
  }

  onSkillLogoError(skillId: number): void {
    const current = this.logoVariantIndex.get(skillId) ?? 0;
    this.logoVariantIndex.set(skillId, current + 1);
  }

  getSkillMonogram(skill: Skill): string {
    const shortForm = (skill.shortForm || '').trim();
    if (shortForm) {
      return shortForm.slice(0, 3).toUpperCase();
    }

    const words = (skill.skillName || '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
    }

    return (words[0] || 'SK').slice(0, 2).toUpperCase();
  }

  getSkillAccent(skill: Skill, category: string): string {
    const normalizedBrand = this.normalizeHexColor(skill.brandColor);
    if (normalizedBrand) {
      return normalizedBrand;
    }

    const seed = `${category}|${skill.skillName}`.toLowerCase();
    const palettes = ['#5b6ee1', '#4f8bb6', '#2f9c95', '#9a6ad8', '#b57443', '#4b8f59'];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    return palettes[hash % palettes.length];
  }

  private fetchSkills(portfolioId: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.getPortfolioSkills(portfolioId).subscribe({
      next: (data) => {
        const visible = data
          .filter(item => item.isVisible)
          .sort((a, b) => a.displayOrder - b.displayOrder);

        const groupsMap = new Map<string, Skill[]>();
        for (const skill of visible) {
          const category = this.normalizeCategory(skill.category);
          const current = groupsMap.get(category) ?? [];
          current.push(skill);
          groupsMap.set(category, current);
        }

        this.skillGroups = Array.from(groupsMap.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([category, items]) => ({ category, items }));

        this.logoVariantIndex.clear();
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
    const value = (category || '').trim();
    return value || 'General';
  }

  private getDriveImageCandidates(fileId: string): string[] {
    return [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w240`,
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
}
