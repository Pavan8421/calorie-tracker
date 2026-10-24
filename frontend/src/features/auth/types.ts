export type User = {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type AccessTokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
  timezone: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UpdateProfilePayload = {
  full_name?: string;
  timezone?: string;
};
