import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Experience } from '../../interfaces';
import { ApiService } from '../../services/api.service';

type EmploymentCategory = 'full-time' | 'part-time' | 'internship' | 'freelance' | 'other';

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

  private readonly collapsedPointCount = 4;
  private readonly expandedExperienceIds = new Set<number>();
  private readonly failedCompanyLogoIds = new Set<number>();
  private readonly companyLogoVariantIndex = new Map<number, number>();
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
    const points = Array.isArray(detailed)
      ? detailed.map(point => (point || '').trim()).filter(Boolean)
      : typeof detailed === 'string'
        ? this.parseDetailedDescriptionString(detailed)
        : this.getFallbackPoints(item.shortDescription);

    if (points.length <= 1) {
      return points;
    }

    const impactFirst: string[] = [];
    const others: string[] = [];
    for (const point of points) {
      if (this.looksImpactDriven(point)) {
        impactFirst.push(point);
      } else {
        others.push(point);
      }
    }

    return [...impactFirst, ...others];
  }

  getVisibleExperiencePoints(item: Experience): string[] {
    const points = this.getExperiencePoints(item);
    if (this.expandedExperienceIds.has(item.id)) {
      return points;
    }

    return points.slice(0, this.collapsedPointCount);
  }

  hasHiddenPoints(item: Experience): boolean {
    return this.getExperiencePoints(item).length > this.collapsedPointCount;
  }

  isExpanded(item: Experience): boolean {
    return this.expandedExperienceIds.has(item.id);
  }

  togglePoints(item: Experience): void {
    if (this.expandedExperienceIds.has(item.id)) {
      this.expandedExperienceIds.delete(item.id);
      return;
    }

    this.expandedExperienceIds.add(item.id);
  }

  getDurationLabel(item: Experience): string {
    const start = this.parseDate(item.startDate);
    const end = item.isCurrent ? new Date() : this.parseDate(item.endDate);

    const startLabel = this.formatMonthYearDate(start);
    const endLabel = item.isCurrent ? 'Present' : this.formatMonthYearDate(end);

    if (!startLabel && !endLabel) {
      return 'Not specified';
    }

    const range = startLabel
      ? `${startLabel} - ${endLabel || 'Not specified'}`
      : endLabel || 'Not specified';

    const tenure = this.getTenureLabel(start, end);
    return tenure ? `${range} · ${tenure}` : range;
  }

  getEmploymentTypeLabel(item: Experience): string {
    const type = (item.employmentType || '').trim();
    if (!type) {
      return 'Professional Role';
    }

    const category = this.getEmploymentTypeCategory(type);
    if (category === 'full-time') {
      return 'Full Time';
    }
    if (category === 'part-time') {
      return 'Part Time';
    }
    if (category === 'internship') {
      return 'Internship';
    }
    if (category === 'freelance') {
      return 'Freelance';
    }

    return type;
  }

  getEmploymentTypeClass(item: Experience): string {
    const type = (item.employmentType || '').trim();
    return this.getEmploymentTypeCategory(type);
  }

  getCompanyLogoSrc(item: Experience): string | null {
    if (this.failedCompanyLogoIds.has(item.id)) {
      return null;
    }

    const rawValue = (item.companyLogo || '').trim();
    if (!rawValue) {
      return null;
    }

    const source = this.extractImageSource(rawValue);
    if (!source) {
      return null;
    }

    const fileId = this.extractDriveFileId(source);
    if (!fileId) {
      return source;
    }

    const variants = this.getDriveImageCandidates(fileId);
    const index = this.companyLogoVariantIndex.get(item.id) ?? 0;
    return variants[index] ?? variants[0] ?? null;
  }

  onCompanyLogoError(experienceId: number): void {
    const item = this.experiences.find(experience => experience.id === experienceId);
    if (!item) {
      this.failedCompanyLogoIds.add(experienceId);
      return;
    }

    const source = this.extractImageSource((item.companyLogo || '').trim());
    const fileId = source ? this.extractDriveFileId(source) : null;
    if (!fileId) {
      this.failedCompanyLogoIds.add(experienceId);
      return;
    }

    const variantsCount = this.getDriveImageCandidates(fileId).length;
    const current = this.companyLogoVariantIndex.get(experienceId) ?? 0;
    const next = current + 1;
    if (next >= variantsCount) {
      this.failedCompanyLogoIds.add(experienceId);
      return;
    }

    this.companyLogoVariantIndex.set(experienceId, next);
  }

  getCompanyMonogram(item: Experience): string {
    const words = (item.companyName || '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
    }

    return (words[0] || 'CO').slice(0, 2).toUpperCase();
  }

  private fetchExperiences(portfolioId: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.getPortfolioExperiences(portfolioId).subscribe({
      next: (items) => {
        this.experiences = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
        this.expandedExperienceIds.clear();
        this.failedCompanyLogoIds.clear();
        this.companyLogoVariantIndex.clear();
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

  private parseDetailedDescriptionString(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
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

  private looksImpactDriven(point: string): boolean {
    return /(\d+\s?%|\d+(?:\.\d+)?\s?(?:x|ms|s|sec|secs|seconds|min|mins|minutes|hr|hrs|hours|day|days|week|weeks|month|months|year|years)|improv|reduc|optim|increas|decreas|saved|scaled|grew|boosted)/i.test(point);
  }

  private parseDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatMonthYearDate(date: Date | null): string {
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  private getTenureLabel(start: Date | null, end: Date | null): string {
    if (!start || !end || end < start) {
      return '';
    }

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) {
      months -= 1;
    }

    months = Math.max(0, months);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    const yearPart = years > 0 ? `${years} ${years === 1 ? 'yr' : 'yrs'}` : '';
    const monthPart = remainingMonths > 0 ? `${remainingMonths} ${remainingMonths === 1 ? 'mo' : 'mos'}` : '';

    if (yearPart && monthPart) {
      return `${yearPart} ${monthPart}`;
    }

    return yearPart || monthPart || '0 mo';
  }

  private getEmploymentTypeCategory(type: string): EmploymentCategory {
    const normalized = type.toLowerCase();
    if (normalized.includes('full')) {
      return 'full-time';
    }
    if (normalized.includes('part')) {
      return 'part-time';
    }
    if (normalized.includes('intern')) {
      return 'internship';
    }
    if (normalized.includes('free') || normalized.includes('contract')) {
      return 'freelance';
    }

    return 'other';
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

      return parsed.map(item => String(item || '').trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  private getFallbackPoints(shortDescription: string | null): string[] {
    const fallback = (shortDescription || '').trim();
    return fallback ? [fallback] : [];
  }

  private extractImageSource(rawValue: string): string | null {
    if (!rawValue) {
      return null;
    }

    if (rawValue.startsWith('<')) {
      const srcMatch = rawValue.match(/src\s*=\s*['\"]([^'\"]+)['\"]/i);
      return srcMatch?.[1]?.trim() || null;
    }

    return rawValue;
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

  private getDriveImageCandidates(fileId: string): string[] {
    return [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w240`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];
  }
}
