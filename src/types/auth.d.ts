export type Role = 'server' | 'admin' | 'leader' | 'player';

export type jwtPayload = {
  roles: Role[];
  player?: {
    id: string;
    teams: string[]
  };
  leader?: {
    id: string;
    email: string;
    teams: string[]
  };
  admin?: {
    id: string;
    email: string;
  },
  exp?: number;
  iat?: number;
}

export type GoogleUserPayload = { sub: string, name: string, given_name: string, family_name: string, picture: string, email: string, email_verified: boolean }; 