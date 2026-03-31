import { TechnologyItem } from './technology-item.interface';

export interface Certification {
  id: number;
  portfolioId: number;
  certificateName: string;
  issuingOrganization: string;
  credentialId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  certificateUrl: string | null;
  badgeImageUrl: string | null;
  description: string | null;
  skillsCovered: TechnologyItem[] | null;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
