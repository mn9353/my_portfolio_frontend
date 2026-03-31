export interface Education {
  id: number;
  portfolioId: number;
  institutionName: string;
  degree: string;
  fieldOfStudy: string | null;
  location: string | null;
  grade: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
