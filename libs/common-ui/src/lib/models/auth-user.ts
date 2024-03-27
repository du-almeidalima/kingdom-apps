/** Generic User model not tied to any application */
export type AuthUser = {
  name: string;
  roles: string[] | string;
}
