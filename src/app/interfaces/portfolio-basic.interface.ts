export interface PortfolioBasic {
  id: number;
  fullName: string;
  shortForm: string | null;
  role: string | null;
  openToWork: boolean;
  headline: string | null;
  subheadline: string | null;
  aboutMe: string | null;
  email: string | null;
  phoneNumber: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  resumeUrl: string | null;
  profileImageUrl: string | null;
  themeName: string | null;
}
