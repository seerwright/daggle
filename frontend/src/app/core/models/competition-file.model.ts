export interface CompetitionFile {
  id: number;
  competition_id: number;
  filename: string;
  display_name: string | null;
  purpose: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}
