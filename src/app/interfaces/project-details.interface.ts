import { Project } from './project.interface';

export interface ProjectDetailRecord {
  id: number;
  projectId: number;
  role: string | null;
  teamSize: number | null;
  durationStart: string | null;
  durationEnd: string | null;
  isCurrent: boolean;
  architecture: string | null;
  problemStatement: string | null;
  solutionApproach: string | null;
  outcomeSummary: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectDetailPoint {
  id: number;
  projectId: number;
  pointType: string;
  content: string;
  displayOrder: number;
}

export interface ProjectDetailMedia {
  id: number;
  projectId: number;
  mediaType: 'image' | 'video' | string;
  mediaUrl: string;
  caption: string | null;
  isCover: boolean;
  displayOrder: number;
}

export interface ProjectDetailLink {
  id: number;
  projectId: number;
  label: string;
  url: string;
  displayOrder: number;
}

export interface ProjectDetailsResponse {
  project: Project;
  details: ProjectDetailRecord | null;
  points: ProjectDetailPoint[];
  media: ProjectDetailMedia[];
  links: ProjectDetailLink[];
}
