export interface CompetitionFile {
  id: number;
  competition_id: number;
  filename: string;
  display_name: string | null;
  purpose: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  variable_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataDictionaryEntry {
  id: number;
  file_id: number;
  column_name: string;
  definition: string | null;
  encoding: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnInfo {
  name: string;
  dtype: string;
  sample_values: string[];
  null_count: number;
  unique_count: number;
}

export interface FilePreview {
  columns: string[];
  rows: Record<string, string>[];
  total_rows: number;
  truncated: boolean;
}
