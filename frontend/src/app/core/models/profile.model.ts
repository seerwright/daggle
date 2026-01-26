export interface ProfileParticipation {
  competition_id: number;
  competition_title: string;
  competition_slug: string;
  enrolled_at: string;
  submission_count: number;
  best_score: number | null;
  rank: number | null;
  total_participants: number;
}

export interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
  participations: ProfileParticipation[];
}

export interface ProfileStats {
  total_competitions: number;
  total_submissions: number;
  best_rank: number | null;
  competitions_with_submissions: number;
}

export interface ProfileStatsResponse {
  username: string;
  display_name: string;
  stats: ProfileStats;
}

export interface ProfileUpdate {
  display_name?: string;
}
