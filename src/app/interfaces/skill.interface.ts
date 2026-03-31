export interface Skill {
  id: number;
  portfolioId: number;
  skillName: string;
  shortForm: string | null;
  category: string | null;
  logoUrl: string | null;
  iconName: string | null;
  brandColor: string | null;
  secondaryColor: string | null;
  proficiencyLevel: string | null;
  yearsOfExperience: number | null;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
