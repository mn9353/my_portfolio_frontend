import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Testimonial } from '../../interfaces';
import { TranslatePipe } from '../../pipes/translate.pipe';

type TestimonialsLayout = 'cards' | 'grid' | 'timeline' | 'moving cards';

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './testimonials-section.component.html',
  styleUrl: './testimonials-section.component.css'
})
export class TestimonialsSectionComponent implements OnChanges {
  @Input() heading = 'Testimonials';
  @Input() description = '';
  @Input() portfolioId!: number;
  @Input() sectionType: string | null = null;

  testimonials: Testimonial[] = [];
  isLoading = false;
  loadError = '';
  readonly stars = [1, 2, 3, 4, 5];

  private readonly profileVariantIndex = new Map<number, number>();
  private readonly failedProfileIds = new Set<number>();
  private readonly apiService = inject(ApiService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId']?.currentValue) {
      this.fetchTestimonials(changes['portfolioId'].currentValue);
    }
  }

  get hasTestimonials(): boolean {
    return this.testimonials.length > 0;
  }

  get layout(): TestimonialsLayout {
    const normalized = (this.sectionType || '').trim().toLowerCase();
    if (normalized === 'grid') {
      return 'grid';
    }
    if (normalized === 'timeline') {
      return 'timeline';
    }
    if (normalized === 'moving cards') {
      return 'moving cards';
    }
    return 'cards';
  }

  get movingTestimonials(): Testimonial[] {
    if (this.testimonials.length === 0) {
      return [];
    }
    return [...this.testimonials, ...this.testimonials];
  }

  getProfileImageSrc(item: Testimonial): string | null {
    if (this.failedProfileIds.has(item.id)) {
      return null;
    }

    const raw = (item.profileImageUrl || '').trim();
    if (!raw) {
      return null;
    }

    const source = this.extractImageSource(raw);
    if (!source) {
      return null;
    }

    const fileId = this.extractDriveFileId(source);
    if (!fileId) {
      return source;
    }

    const variants = this.getDriveImageCandidates(fileId);
    const index = this.profileVariantIndex.get(item.id) ?? 0;
    return variants[index] ?? variants[0] ?? null;
  }

  onProfileImageError(itemId: number): void {
    const item = this.testimonials.find(testimonial => testimonial.id === itemId);
    if (!item) {
      this.failedProfileIds.add(itemId);
      return;
    }

    const source = this.extractImageSource((item.profileImageUrl || '').trim());
    const fileId = source ? this.extractDriveFileId(source) : null;
    if (!fileId) {
      this.failedProfileIds.add(itemId);
      return;
    }

    const variantsCount = this.getDriveImageCandidates(fileId).length;
    const current = this.profileVariantIndex.get(itemId) ?? 0;
    const next = current + 1;
    if (next >= variantsCount) {
      this.failedProfileIds.add(itemId);
      return;
    }

    this.profileVariantIndex.set(itemId, next);
  }

  getInitials(item: Testimonial): string {
    const name = (item.clientName || '').trim();
    if (!name) {
      return 'CL';
    }

    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
    }

    return words[0].slice(0, 2).toUpperCase();
  }

  private fetchTestimonials(portfolioId: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.getPortfolioTestimonials(portfolioId).subscribe({
      next: (items) => {
        this.testimonials = [...items]
          .filter(item => item.isVisible)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        this.profileVariantIndex.clear();
        this.failedProfileIds.clear();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching testimonials:', error);
        this.testimonials = [];
        this.loadError = 'Unable to load testimonials right now.';
        this.isLoading = false;
      }
    });
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
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];
  }
}

