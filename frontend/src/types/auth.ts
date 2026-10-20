export interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  nick: string;
  avatarUrl: string | null;
}

export interface UserProfile extends Applicant {
  email: string;
  position: string;
  company: string | null;
  startupsCount: number;
  vacanciesCount: number;
  applicationsCount: number;
}
