import { Component, Input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-about-section',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './about-section.component.html',
  styleUrl: './about-section.component.css'
})
export class AboutSectionComponent {
  @Input() heading = 'About Me';
  @Input() sectionDescription = '';
  @Input() fullName: string | null = null;
  @Input() aboutText = '';
  @Input() profileImageUrl: string | null = null;
  @Input() role: string | null = null;
  @Input() location: string | null = null;
  @Input() currentCompany: string | null = null;
  @Input() totalExperience: number | null = null;
  @Input() openToWork = false;

  get totalExperienceLabel(): string {
    const years = this.totalExperience;
    if (years === null || years === undefined || Number.isNaN(years) || years < 0) {
      return '';
    }

    const normalized = Number.isInteger(years) ? years.toFixed(0) : years.toFixed(1);
    return `${normalized}+ years experience`;
  }

  get hasAbout(): boolean {
    return this.aboutParagraphs.length > 0 || !!this.sectionDescription.trim();
  }

  get greetingLead(): string {
    const name = (this.fullName || '').trim();
    return name ? `Hi, I'm ${name},` : "Hi, I'm";
  }

  get aboutFirstParagraph(): string {
    return this.aboutParagraphs[0] || '';
  }

  get aboutRemainingParagraphs(): string[] {
    return this.aboutParagraphs.slice(1);
  }

  get aboutParagraphs(): string[] {
    const text = this.getNormalizedAboutText();
    if (!text) {
      return [];
    }

    return text
      .split(/\r?\n\s*\r?\n|\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  private getNormalizedAboutText(): string {
    const raw = (this.aboutText || '').trim();
    if (!raw) {
      return '';
    }

    const fullName = (this.fullName || '').trim();
    if (!fullName) {
      return raw;
    }

    const escapedName = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const introPattern = new RegExp(`^\\s*hi\\s*,?\\s*i['’]?m\\s+${escapedName}\\s*[,.!:\\-]?\\s*`, 'i');
    return raw.replace(introPattern, '').trim() || raw;
  }
}
