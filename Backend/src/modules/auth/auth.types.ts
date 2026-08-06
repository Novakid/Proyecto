export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}
