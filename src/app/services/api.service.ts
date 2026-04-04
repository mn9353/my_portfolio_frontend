import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Achievement,
  Certification,
  Education,
  Experience,
  Language,
  PortfolioBasic,
  ProjectDetailsResponse,
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
  private readonly skillsCache = new Map<string, Observable<Skill[]>>();

  constructor(private http: HttpClient) {}

  getPortfolioBasic(portfolioId: string | number): Observable<PortfolioBasic> {
    return this.get<PortfolioBasic>(`/api/portfolio/basic/${portfolioId}`);
  }

  getPortfolioProjects(portfolioId: string | number): Observable<Project[]> {
    return this.get<Project[]>(`/api/portfolio/projects/${portfolioId}`);
  }

  getPortfolioProjectDetails(projectId: string | number): Observable<ProjectDetailsResponse> {
    return this.get<unknown>(`/api/portfolio/project-details/${projectId}`)
      .pipe(map((raw) => this.normalizeProjectDetailsResponse(raw, Number(projectId))));
  }

  getPortfolioExperiences(portfolioId: string | number): Observable<Experience[]> {
    return this.get<Experience[]>(`/api/portfolio/experiences/${portfolioId}`);
  }

  getPortfolioEducation(portfolioId: string | number): Observable<Education[]> {
    return this.get<Education[]>(`/api/portfolio/education/${portfolioId}`);
  }

  getPortfolioSkills(portfolioId: string | number): Observable<Skill[]> {
    const key = String(portfolioId);
    const cached = this.skillsCache.get(key);
    if (cached) {
      return cached;
    }

    const request = this.get<Skill[]>(`/api/portfolio/skills/${portfolioId}`).pipe(shareReplay(1));
    this.skillsCache.set(key, request);
    return request;
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

  private normalizeProjectDetailsResponse(raw: unknown, projectId: number): ProjectDetailsResponse {
    const source = this.unwrapRoot(raw);
    const project = this.normalizeProject((source as Record<string, unknown>)['project'] ?? source, projectId);
    const details = this.normalizeDetailRecord((source as Record<string, unknown>)['details'] ?? source, project.id || projectId);
    const points = this.normalizePoints(
      (source as Record<string, unknown>)['points']
      ?? (source as Record<string, unknown>)['detailPoints']
      ?? (source as Record<string, unknown>)['project_detail_points'],
      project.id || projectId
    );
    const media = this.normalizeMedia(
      (source as Record<string, unknown>)['media']
      ?? (source as Record<string, unknown>)['projectMedia']
      ?? (source as Record<string, unknown>)['project_media'],
      project.id || projectId
    );
    const links = this.normalizeLinks(
      (source as Record<string, unknown>)['links']
      ?? (source as Record<string, unknown>)['projectLinks']
      ?? (source as Record<string, unknown>)['project_links'],
      project.id || projectId
    );

    return { project, details, points, media, links };
  }

  private unwrapRoot(raw: unknown): unknown {
    if (Array.isArray(raw)) {
      return raw[0] ?? {};
    }
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    const record = raw as Record<string, unknown>;
    return record['data'] ?? record['result'] ?? record;
  }

  private normalizeProject(raw: unknown, fallbackId: number): ProjectDetailsResponse['project'] {
    const record = this.asRecord(raw);
    const technologiesRaw = record['technologiesUsed'] ?? record['technologies_used'];
    const technologiesUsed = this.parseJsonArray(technologiesRaw);

    return {
      id: this.toNumber(record['id']) ?? fallbackId,
      portfolioId: this.toNumber(record['portfolioId'] ?? record['portfolio_id']) ?? 0,
      projectKey: this.toString(record['projectKey'] ?? record['project_key']) ?? '',
      title: this.toString(record['title']) ?? 'Project',
      shortDescription: this.toString(record['shortDescription'] ?? record['short_description']),
      detailedDescription: this.toString(record['detailedDescription'] ?? record['detailed_description']),
      technologiesUsed: technologiesUsed as ProjectDetailsResponse['project']['technologiesUsed'],
      githubUrl: this.toString(record['githubUrl'] ?? record['github_url']),
      liveUrl: this.toString(record['liveUrl'] ?? record['live_url']),
      imageUrl: this.toString(record['imageUrl'] ?? record['image_url']),
      projectType: this.toString(record['projectType'] ?? record['project_type']),
      status: this.toString(record['status']),
      isFeatured: this.toBoolean(record['isFeatured'] ?? record['is_featured']),
      displayOrder: this.toNumber(record['displayOrder'] ?? record['display_order']) ?? 0,
      createdAt: this.toString(record['createdAt'] ?? record['created_at']) ?? '',
      updatedAt: this.toString(record['updatedAt'] ?? record['updated_at']) ?? ''
    };
  }

  private normalizeDetailRecord(raw: unknown, projectId: number): ProjectDetailsResponse['details'] {
    const record = this.asRecord(raw);

    if (Object.keys(record).length === 0) {
      return null;
    }

    return {
      id: this.toNumber(record['id']) ?? 0,
      projectId: this.toNumber(record['projectId'] ?? record['project_id']) ?? projectId,
      role: this.toString(record['role']),
      teamSize: this.toNumber(record['teamSize'] ?? record['team_size']),
      durationStart: this.toString(record['durationStart'] ?? record['duration_start']),
      durationEnd: this.toString(record['durationEnd'] ?? record['duration_end']),
      isCurrent: this.toBoolean(record['isCurrent'] ?? record['is_current']),
      architecture: this.toString(record['architecture']),
      problemStatement: this.toString(record['problemStatement'] ?? record['problem_statement']),
      solutionApproach: this.toString(record['solutionApproach'] ?? record['solution_approach']),
      outcomeSummary: this.toString(record['outcomeSummary'] ?? record['outcome_summary']),
      createdAt: this.toString(record['createdAt'] ?? record['created_at']),
      updatedAt: this.toString(record['updatedAt'] ?? record['updated_at'])
    };
  }

  private normalizePoints(raw: unknown, projectId: number): ProjectDetailsResponse['points'] {
    const objectRecord = this.asRecord(raw);
    const objectKeys = Object.keys(objectRecord);
    if (objectKeys.length > 0 && !Array.isArray(raw)) {
      const mappedFromObject = this.pointsFromGroupedObject(objectRecord, projectId);
      if (mappedFromObject.length > 0) {
        return mappedFromObject;
      }
    }

    const list = this.parseJsonArray(raw);
    return list.map((item, index) => {
      const record = this.asRecord(item);
      return {
        id: this.toNumber(record['id']) ?? index + 1,
        projectId: this.toNumber(record['projectId'] ?? record['project_id']) ?? projectId,
        pointType: this.toString(record['pointType'] ?? record['point_type']) ?? 'features',
        content: this.toString(record['content']) ?? '',
        displayOrder: this.toNumber(record['displayOrder'] ?? record['display_order']) ?? index + 1
      };
    }).filter(point => !!point.content);
  }

  private normalizeMedia(raw: unknown, projectId: number): ProjectDetailsResponse['media'] {
    const list = this.parseJsonArray(raw);
    return list.map((item, index) => {
      const record = this.asRecord(item);
      return {
        id: this.toNumber(record['id']) ?? index + 1,
        projectId: this.toNumber(record['projectId'] ?? record['project_id']) ?? projectId,
        mediaType: this.toString(record['mediaType'] ?? record['media_type'] ?? record['type'] ?? record['Type']) ?? 'image',
        mediaUrl: this.toString(record['mediaUrl'] ?? record['media_url'] ?? record['url'] ?? record['Url']) ?? '',
        caption: this.toString(record['caption']),
        isCover: this.toBoolean(record['isCover'] ?? record['is_cover']),
        displayOrder: this.toNumber(record['displayOrder'] ?? record['display_order']) ?? index + 1
      };
    }).filter(item => !!item.mediaUrl);
  }

  private normalizeLinks(raw: unknown, projectId: number): ProjectDetailsResponse['links'] {
    const list = this.parseJsonArray(raw);
    return list.map((item, index) => {
      const record = this.asRecord(item);
      return {
        id: this.toNumber(record['id']) ?? index + 1,
        projectId: this.toNumber(record['projectId'] ?? record['project_id']) ?? projectId,
        label: this.toString(record['label'] ?? record['Label']) ?? 'Link',
        url: this.toString(record['url'] ?? record['Url']) ?? '',
        displayOrder: this.toNumber(record['displayOrder'] ?? record['display_order']) ?? index + 1
      };
    }).filter(item => !!item.url);
  }

  private pointsFromGroupedObject(record: Record<string, unknown>, projectId: number): ProjectDetailsResponse['points'] {
    const mapping: Array<{ key: string; type: string }> = [
      { key: 'features', type: 'features' },
      { key: 'Features', type: 'features' },
      { key: 'impact', type: 'impact' },
      { key: 'Impact', type: 'impact' },
      { key: 'responsibilities', type: 'responsibilities' },
      { key: 'Responsibilities', type: 'responsibilities' }
    ];

    const points: ProjectDetailsResponse['points'] = [];
    let idCounter = 1;

    for (const entry of mapping) {
      const items = this.parseJsonArray(record[entry.key]);
      let order = 1;
      for (const item of items) {
        const text = typeof item === 'string' ? item.trim() : this.toString(this.asRecord(item)['content'] ?? this.asRecord(item)['Content']) ?? '';
        if (!text) {
          continue;
        }
        points.push({
          id: idCounter++,
          projectId,
          pointType: entry.type,
          content: text,
          displayOrder: order++
        });
      }
    }

    return points;
  }

  private parseJsonArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private toString(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    return null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return false;
  }
}
