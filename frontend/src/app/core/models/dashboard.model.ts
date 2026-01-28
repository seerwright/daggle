export interface DashboardCompetition {
  id: number;
  title: string;
  slug: string;
  status: string;
  end_date: string;
  days_remaining: number | null;
  user_rank: number | null;
  total_participants: number;
  user_best_score: number | null;
  user_submission_count: number;
}

export interface DashboardSubmission {
  id: number;
  competition_id: number;
  competition_title: string;
  competition_slug: string;
  public_score: number | null;
  status: string;
  submitted_at: string;
}

export interface DashboardNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_competitions: number;
  active_competitions: number;
  total_submissions: number;
  unread_notifications: number;
}

export interface DashboardResponse {
  user_id: number;
  username: string;
  display_name: string;
  active_competitions: DashboardCompetition[];
  recent_submissions: DashboardSubmission[];
  notifications: DashboardNotification[];
  stats: DashboardStats;
}

export interface DashboardStatsResponse extends DashboardStats {}
