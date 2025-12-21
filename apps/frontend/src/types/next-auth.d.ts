import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
      tenantName: string;
      image?: string;
    } & DefaultSession["user"];
    backendToken?: string;
    provider?: string;
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string;
    role?: string;
    tenantId?: string;
    tenantName?: string;
    backendToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    tenantId?: string;
    tenantName?: string;
    backendToken?: string;
    provider?: string;
  }
}

