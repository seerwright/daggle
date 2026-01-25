export interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  role: 'participant' | 'sponsor' | 'admin';
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  display_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
