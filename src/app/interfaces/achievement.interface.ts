export interface Achievement {
  id: number;
  portfolioId: number;
  title: string;
  metricValue: string | null;
  metricLabel: string | null;
  description: string | null;
  iconName: string | null;
  highlightColor: string | null;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
