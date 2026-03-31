export interface Testimonial {
  id: number;
  portfolioId: number;
  clientName: string;
  designation: string | null;
  companyName: string | null;
  testimonialText: string;
  profileImageUrl: string | null;
  rating: number | null;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
