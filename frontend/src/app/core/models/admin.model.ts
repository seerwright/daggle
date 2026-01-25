export type UserRole = 'participant' | 'sponsor' | 'admin';
export type CompetitionStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface PlatformStats {
  total_users: number;
  active_users_last_30_days: number;
  total_competitions: number;
  active_competitions: number;
  total_submissions: number;
  submissions_last_7_days: number;
  total_enrollments: number;
}

export interface UserSummary {
  id: number;
  email: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  competition_count: number;
  submission_count: number;
}

export interface AdminCompetition {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  status: CompetitionStatus;
  sponsor_id: number;
  start_date: string;
  end_date: string;
  is_public: boolean;
  max_team_size: number;
  daily_submission_limit: number;
  evaluation_metric: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleUpdateRequest {
  role: UserRole;
}

export interface AdminActionResponse {
  message: string;
  success: boolean;
}
