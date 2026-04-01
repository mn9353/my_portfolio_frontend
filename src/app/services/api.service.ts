import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Achievement,
  Certification,
  Education,
  Experience,
  Language,
  PortfolioBasic,
  Project,
  Section,
  Skill,
  SocialLink,
  Testimonial,
  TranslationKeyValue
} from '../interfaces';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly translationApiBaseUrl = environment.translationApiBaseUrl || environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getPortfolioBasic(portfolioId: string | number): Observable<PortfolioBasic> {
    return this.get<PortfolioBasic>(`/api/portfolio/basic/${portfolioId}`);
  }

  getPortfolioProjects(portfolioId: string | number): Observable<Project[]> {
    return this.get<Project[]>(`/api/portfolio/projects/${portfolioId}`);
  }

  getPortfolioExperiences(portfolioId: string | number): Observable<Experience[]> {
    return this.get<Experience[]>(`/api/portfolio/experiences/${portfolioId}`);
  }

  getPortfolioEducation(portfolioId: string | number): Observable<Education[]> {
    return this.get<Education[]>(`/api/portfolio/education/${portfolioId}`);
  }

  getPortfolioSkills(portfolioId: string | number): Observable<Skill[]> {
    return this.get<Skill[]>(`/api/portfolio/skills/${portfolioId}`);
  }

  getPortfolioCertifications(portfolioId: string | number): Observable<Certification[]> {
    return this.get<Certification[]>(`/api/portfolio/certifications/${portfolioId}`);
  }

  getPortfolioAchievements(portfolioId: string | number): Observable<Achievement[]> {
    return this.get<Achievement[]>(`/api/portfolio/achievements/${portfolioId}`);
  }

  getPortfolioSocialLinks(portfolioId: string | number): Observable<SocialLink[]> {
    return this.get<SocialLink[]>(`/api/portfolio/social-links/${portfolioId}`);
  }

  getPortfolioTestimonials(portfolioId: string | number): Observable<Testimonial[]> {
    return this.get<Testimonial[]>(`/api/portfolio/testimonials/${portfolioId}`);
  }

  getSectionsByPortfolioId(portfolioId: string | number): Observable<Section[]> {
    return this.get<Section[]>(`/api/sections/${portfolioId}`);
  }

  getLanguages(includeInactive = false): Observable<Language[]> {
    return this.get<Language[]>('/api/languages', { includeInactive });
  }

  getTranslationsByLanguageCode(languageCode: string): Observable<TranslationKeyValue[]> {
    const normalizedCode = (languageCode || '').trim().toUpperCase();
    const safeCode = encodeURIComponent(normalizedCode);
    const baseUrl = this.translationApiBaseUrl.replace(/\/$/, '');
    return this.http.get<TranslationKeyValue[]>(`${baseUrl}/api/translations/${safeCode}`);
  }

  private get<T>(endpoint: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.resolveUrl(endpoint), {
      params: this.toHttpParams(params)
    });
  }

  private resolveUrl(endpoint: string): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${path}`;
  }

  private toHttpParams(params?: QueryParams): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}
