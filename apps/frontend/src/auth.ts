import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Backend API URL for server-side calls (Auth.js runs on server)
// Use BACKEND_INTERNAL_URL for direct server-to-server communication
// This bypasses nginx which routes /api/auth/* to Next.js
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID!,
      clientSecret: process.env.AUTH_APPLE_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call backend API to validate credentials
          // tenantSubdomain can be passed from the login form, default to "system" for superadmin
          const tenantSubdomain = (credentials as any).tenantSubdomain || "system";
          
          const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              tenantSubdomain,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const apiResponse = await response.json();

          // Backend wraps response in ApiResponse { success, data, message }
          if (apiResponse.success && apiResponse.data?.user) {
            const { user, tenant, access_token } = apiResponse.data;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: tenant?.id,
              tenantName: tenant?.name,
              backendToken: access_token,
            };
          }

          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    newUser: "/register",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers, sync user with backend
      if (account?.provider !== "credentials" && account?.provider) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/oauth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
            }),
          });

          if (response.ok) {
            const apiResponse = await response.json();
            // Backend wraps response in ApiResponse { success, data, message }
            if (apiResponse.success && apiResponse.data) {
              const { user: backendUser, tenant, access_token } = apiResponse.data;
              user.id = backendUser.id;
              user.role = backendUser.role;
              user.tenantId = tenant?.id;
              user.tenantName = tenant?.name;
              user.backendToken = access_token;
            }
          }
        } catch (error) {
          console.error("OAuth sync error:", error);
          // Still allow sign in even if backend sync fails
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.backendToken = user.backendToken;
        token.provider = account?.provider;
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token.tenantId = session.tenantId ?? token.tenantId;
        token.tenantName = session.tenantName ?? token.tenantName;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.backendToken = token.backendToken as string;
        session.provider = token.provider as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

