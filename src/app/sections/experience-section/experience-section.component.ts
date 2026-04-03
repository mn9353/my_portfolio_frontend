import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Experience } from '../../interfaces';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './experience-section.component.html',
  styleUrl: './experience-section.component.css'
})
export class ExperienceSectionComponent implements OnChanges {
  @Input() heading = 'Experience';
  @Input() portfolioId!: number;

  experiences: Experience[] = [];
  isLoading = false;
  loadError = '';

  private readonly apiService = inject(ApiService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId']?.currentValue) {
      this.fetchExperiences(changes['portfolioId'].currentValue);
    }
  }

  get hasExperiences(): boolean {
    return this.experiences.length > 0;
  }

  getExperiencePoints(item: Experience): string[] {
    const detailed = item.detailedDescription;
    if (Array.isArray(detailed)) {
      const cleaned = detailed.map(point => (point || '').trim()).filter(Boolean);
      if (cleaned.length > 0) {
        return cleaned;
      }
    }

    if (typeof detailed === 'string') {
      const trimmed = detailed.trim();
      if (!trimmed) {
        return this.getFallbackPoints(item.shortDescription);
      }

      const parsedFromJson = this.tryParseStringArray(trimmed);
      if (parsedFromJson.length > 0) {
        return parsedFromJson;
      }

      const segmented = trimmed
        .split(/\r?\n|\s*[•\-]\s+/)
        .map(point => point.trim())
        .filter(Boolean);

      if (segmented.length > 1) {
        return segmented;
      }

      return [trimmed];
    }

    return this.getFallbackPoints(item.shortDescription);
  }

  getDurationLabel(item: Experience): string {
    const start = this.formatMonthYear(item.startDate);
    if (!start) {
      return item.isCurrent ? 'Present' : 'Not specified';
    }

    if (item.isCurrent) {
      return `${start} - Present`;
    }

    const end = this.formatMonthYear(item.endDate);
    return end ? `${start} - ${end}` : `${start} - Not specified`;
  }

  getEmploymentTypeLabel(item: Experience): string {
    const type = (item.employmentType || '').trim();
    if (!type) {
      return 'Professional Role';
    }

    const normalized = type.toLowerCase();
    if (normalized.includes('full')) {
      return 'Full Time';
    }
    if (normalized.includes('part')) {
      return 'Part Time';
    }
    if (normalized.includes('intern')) {
      return 'Internship';
    }
    if (normalized.includes('free')) {
      return 'Freelance';
    }

    return type;
  }

  private fetchExperiences(portfolioId: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.getPortfolioExperiences(portfolioId).subscribe({
      next: (items) => {
        this.experiences = [...items]
          .sort((a, b) => a.displayOrder - b.displayOrder);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching experiences:', error);
        this.experiences = [];
        this.loadError = 'Unable to load experience right now.';
        this.isLoading = false;
      }
    });
  }

  private formatMonthYear(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  private tryParseStringArray(value: string): string[] {
    if (!value.startsWith('[') || !value.endsWith(']')) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map(item => String(item || '').trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private getFallbackPoints(shortDescription: string | null): string[] {
    const fallback = (shortDescription || '').trim();
    return fallback ? [fallback] : [];
  }
}