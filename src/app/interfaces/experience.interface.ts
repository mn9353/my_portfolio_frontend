import { TechnologyItem } from './technology-item.interface';

export interface Experience {
  id: number;
  portfolioId: number;
  companyName: string;
  role: string;
  shortDescription: string | null;
  detailedDescription: string[] | string | null;
  technologiesUsed: TechnologyItem[] | null;
  location: string | null;
  employmentType: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}