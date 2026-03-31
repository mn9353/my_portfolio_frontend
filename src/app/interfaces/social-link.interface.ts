export interface SocialLink {
  id: number;
  portfolioId: number;
  platformName: string;
  displayName: string | null;
  profileUrl: string;
  iconName: string | null;
  brandColor: string | null;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
