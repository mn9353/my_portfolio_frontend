import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { SocialLink } from '../../interfaces';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-contact-cta-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './contact-cta-section.component.html',
  styleUrl: './contact-cta-section.component.css'
})
export class ContactCtaSectionComponent implements OnChanges, OnDestroy {
  @Input() heading = "Let's Connect";
  @Input() description = '';
  @Input() buttonText = 'Get in touch';
  @Input() buttonUrl = '';
  @Input() portfolioId!: number;
  @Input() availabilityText = '';
  @Input() email: string | null = null;
  @Input() phoneNumber: string | null = null;
  @Input() linkedinUrl: string | null = null;
  @Input() githubUrl: string | null = null;

  socialLinks: SocialLink[] = [];
  isLoading = false;
  copiedField: 'email' | 'phone' | null = null;
  private readonly failedIconIds = new Set<number>();
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly apiService = inject(ApiService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['portfolioId']?.currentValue) {
      this.fetchSocialLinks(changes['portfolioId'].currentValue);
    }
  }

  ngOnDestroy(): void {
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
    }
  }

  get primaryCtaHref(): string {
    const direct = (this.buttonUrl || '').trim();
    if (direct) {
      if (this.looksLikeEmail(direct) && !direct.toLowerCase().startsWith('mailto:')) {
        return `mailto:${direct}`;
      }
      return direct;
    }

    const email = (this.email || '').trim();
    if (email) {
      return `mailto:${email}`;
    }

    return '#';
  }

  get emailHref(): string {
    const email = (this.email || '').trim();
    return email ? `mailto:${email}` : '#';
  }

  get normalizedAvailability(): string {
    return (this.availabilityText || '').trim();
  }

  get normalizedDescription(): string {
    return (this.description || '').trim() || 'Feel free to reach out for roles, collaborations, or engineering conversations.';
  }

  get visibleSocialLinks(): SocialLink[] {
    return this.socialLinks.filter(item => item.isVisible);
  }

  get hasPhoneNumber(): boolean {
    return !!this.normalizedPhoneDisplay;
  }

  get normalizedPhoneDisplay(): string {
    const raw = (this.phoneNumber || '').trim();
    if (!raw) {
      return '';
    }

    if (raw.startsWith('+')) {
      return raw;
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      return '';
    }

    if (digitsOnly.startsWith('91') && digitsOnly.length > 10) {
      return `+${digitsOnly}`;
    }

    const localNumber = digitsOnly.length === 10 ? digitsOnly : digitsOnly.replace(/^0+/, '');
    return `+91 ${localNumber}`;
  }

  get normalizedPhoneHref(): string {
    const display = this.normalizedPhoneDisplay;
    if (!display) {
      return '';
    }
    return `tel:${display.replace(/\s+/g, '')}`;
  }

  get fallbackContactLinks(): Array<{ label: string; url: string }> {
    const links: Array<{ label: string; url: string }> = [];

    const email = (this.email || '').trim();
    if (email) {
      links.push({ label: 'Email', url: `mailto:${email}` });
    }

    const linkedin = (this.linkedinUrl || '').trim();
    if (linkedin) {
      links.push({ label: 'LinkedIn', url: linkedin });
    }

    const github = (this.githubUrl || '').trim();
    if (github) {
      links.push({ label: 'GitHub', url: github });
    }

    return links;
  }

  getSocialInitial(item: SocialLink): string {
    const name = (item.platformName || item.displayName || '').trim();
    return (name.slice(0, 1) || 'S').toUpperCase();
  }

  isTwitterLike(item: SocialLink): boolean {
    const platform = (item.platformName || '').trim().toLowerCase();
    const display = (item.displayName || '').trim().toLowerCase();
    return platform === 'x' || platform.includes('twitter') || display.includes('twitter') || display === 'x';
  }

  getSocialIconSrc(item: SocialLink): string | null {
    if (this.failedIconIds.has(item.id)) {
      return null;
    }

    const raw = (item.iconName || '').trim();
    if (!raw) {
      return null;
    }

    return this.extractImageSource(raw);
  }

  onSocialIconError(itemId: number): void {
    this.failedIconIds.add(itemId);
  }

  copyEmail(): void {
    const value = (this.email || '').trim();
    if (!value) {
      return;
    }
    this.copyToClipboard(value, 'email');
  }

  copyPhone(): void {
    const value = this.normalizedPhoneDisplay;
    if (!value) {
      return;
    }
    this.copyToClipboard(value, 'phone');
  }

  onPrimaryCtaClick(event: MouseEvent): void {
    const ctaEmail = this.extractEmailFromValue((this.buttonUrl || '').trim()) || (this.email || '').trim();
    if (!ctaEmail) {
      return;
    }

    const href = this.primaryCtaHref;
    if (!href.toLowerCase().startsWith('mailto:')) {
      return;
    }

    event.preventDefault();
    this.openEmailWithFallback(ctaEmail);
  }

  onEmailClick(event: MouseEvent): void {
    const email = (this.email || '').trim();
    if (!email) {
      return;
    }

    event.preventDefault();
    this.openEmailWithFallback(email);
  }

  private fetchSocialLinks(portfolioId: number): void {
    this.isLoading = true;

    this.apiService.getPortfolioSocialLinks(portfolioId).subscribe({
      next: (items) => {
        this.socialLinks = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
        this.failedIconIds.clear();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching social links:', error);
        this.socialLinks = [];
        this.isLoading = false;
      }
    });
  }

  private copyToClipboard(value: string, field: 'email' | 'phone'): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value)
        .then(() => this.showCopyFeedback(field))
        .catch(() => this.legacyCopy(value, field));
      return;
    }

    this.legacyCopy(value, field);
  }

  private legacyCopy(value: string, field: 'email' | 'phone'): void {
    if (typeof document === 'undefined') {
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.showCopyFeedback(field);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  private showCopyFeedback(field: 'email' | 'phone'): void {
    this.copiedField = field;
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
    }
    this.copyFeedbackTimer = setTimeout(() => {
      this.copiedField = null;
    }, 1400);
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

  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private extractEmailFromValue(value: string): string | null {
    const raw = (value || '').trim();
    if (!raw) {
      return null;
    }

    if (raw.toLowerCase().startsWith('mailto:')) {
      const mailtoBody = raw.slice('mailto:'.length);
      const emailPart = mailtoBody.split('?')[0]?.trim() || '';
      return emailPart || null;
    }

    if (this.looksLikeEmail(raw)) {
      return raw;
    }

    return null;
  }

  private openEmailWithFallback(email: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const safeEmail = email.trim();
    if (!safeEmail) {
      return;
    }

    const mailtoUrl = `mailto:${safeEmail}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(safeEmail)}`;

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let wasHandled = false;

    const cleanup = (): void => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const markHandled = (): void => {
      wasHandled = true;
      cleanup();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        markHandled();
      }
    };

    const onBlur = (): void => {
      markHandled();
    };

    const onPageHide = (): void => {
      markHandled();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);

    window.location.href = mailtoUrl;

    fallbackTimer = setTimeout(() => {
      cleanup();
      if (!wasHandled) {
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      }
    }, 900);
  }
}
