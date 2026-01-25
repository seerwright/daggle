export type SubmissionStatus = 'pending' | 'processing' | 'scored' | 'failed';

export interface Submission {
  id: number;
  competition_id: number;
  user_id: number;
  team_id: number | null;
  file_name: string;
  status: SubmissionStatus;
  public_score: number | null;
  error_message: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  display_name: string;
  best_score: number;
  submission_count: number;
  last_submission: string;
}

export interface Leaderboard {
  competition_id: number;
  competition_title: string;
  entries: LeaderboardEntry[];
  total_participants: number;
}
