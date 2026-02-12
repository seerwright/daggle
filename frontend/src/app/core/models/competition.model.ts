export type CompetitionStatus = 'draft' | 'active' | 'evaluation' | 'completed' | 'archived';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Competition {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  sponsor_id: number;
  sponsor_name: string | null;
  sponsor_title: string | null;
  sponsor_contact_email: string | null;
  status: CompetitionStatus;
  start_date: string;
  end_date: string;
  difficulty: Difficulty;
  max_team_size: number;
  daily_submission_limit: number;
  evaluation_metric: string;
  evaluation_description: string | null;
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
  sponsor_name: string | null;
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
  evaluation_description?: string;
  is_public: boolean;
  sponsor_name?: string;
  sponsor_title?: string;
  sponsor_contact_email?: string;
}
