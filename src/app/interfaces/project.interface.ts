import { TechnologyItem } from './technology-item.interface';

export interface Project {
  id: number;
  portfolioId: number;
  projectKey: string;
  title: string;
  shortDescription: string | null;
  detailedDescription: string | null;
  technologiesUsed: TechnologyItem[] | null;
  githubUrl: string | null;
  liveUrl: string | null;
  imageUrl: string | null;
  projectType: string | null;
  status: string | null;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
