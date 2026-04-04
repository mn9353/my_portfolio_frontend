import { PortfolioBasic } from '../interfaces';

export const DEFAULT_PORTFOLIO_ID = 1;
export const THEME_STORAGE_KEY = 'portfolio_theme_mode';
export const DEFAULT_THEME_MODE: 'light' | 'dark' = 'light';
export const LANGUAGE_STORAGE_KEY = 'portfolio_language_code';

export interface LanguageOption {
  code: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'Hindi' },
  { code: 'KN', label: 'Kannada' },
];

export const BASIC_DETAILS_FALLBACK: PortfolioBasic = {
  id: DEFAULT_PORTFOLIO_ID,
  fullName: 'Manoj N',
  shortForm: 'MN',
  role: 'Full Stack Engineer',
  openToWork: false,
  openToWorkDescription: 'Actively seeking full time roles',
  headline: 'I build scalable full-stack products with clean architecture and real business impact.',
  subheadline: 'Angular - .NET - C# - MongoDB - PostgreSQL',
  aboutMe: 'Full stack developer with hands-on experience building enterprise applications, APIs, dashboards, and scalable backend systems. Passionate about clean architecture, performance, and product-driven engineering.',
  totalExperience: 3.5,
  currentCompany: 'Acumens Technologies',
  email: 'manoj@example.com',
  phoneNumber: '+91-9353780784',
  location: 'Bengaluru, Karnataka, India',
  linkedinUrl: 'https://linkedin.com/in/manoj',
  githubUrl: 'https://github.com/manoj',
  resumeUrl: 'https://drive.google.com/file/d/1JXbQQkrgplsAmNZ-LhRVt_Zir6C2cDiC/view?usp=drivesdk',
  profileImageUrl: 'https://drive.google.com/file/d/1z9tIJxQvaejv-x7XTUmyvb7RTtl2LI7F/view?usp=drivesdk',
  themeName: 'dark'
};

