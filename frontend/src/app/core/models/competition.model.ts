export type CompetitionStatus = 'draft' | 'active' | 'evaluation' | 'completed' | 'archived';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Competition {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  sponsor_id: number;
  status: CompetitionStatus;
  start_date: string;
  end_date: string;
  difficulty: Difficulty;
  max_team_size: number;
  daily_submission_limit: number;
  evaluation_metric: string;
  is_public: boolean;
  has_truth_set: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionListItem {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  status: CompetitionStatus;
  start_date: string;
  end_date: string;
  difficulty: Difficulty;
  is_public: boolean;
  thumbnail_url: string | null;
}

export interface CompetitionCreate {
  title: string;
  description: string;
  short_description: string;
  start_date: string;
  end_date: string;
  difficulty: Difficulty;
  max_team_size: number;
  daily_submission_limit: number;
  evaluation_metric: string;
  is_public: boolean;
}
