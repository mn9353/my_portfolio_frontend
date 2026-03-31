export interface Section {
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  sectionType: string | null;
  displayOrder: number;
  isVisible: boolean;
  backgroundStyle: string | null;
}
