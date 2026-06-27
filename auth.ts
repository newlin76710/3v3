import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { prisma } from "@/lib/prisma";

// LINE 自訂 OAuth Provider
const LINE = {
  id: "line",
  name: "LINE",
  type: "oauth" as const,
  authorization: {
    url: "https://access.line.me/oauth2/v2.1/authorize",
    params: {
      scope: "profile openid email",
      response_type: "code",
    },
  },
  token: "https://api.line.me/oauth2/v2.1/token",
  userinfo: "https://api.line.me/v2/profile",
  profile(profile: { userId: string; displayName: string; pictureUrl?: string }) {
    return {
      id: profile.userId,
      name: profile.displayName,
      email: null,
      image: profile.pictureUrl ?? null,
    };
  },
  clientId: process.env.LINE_CLIENT_ID!,
  clientSecret: process.env.LINE_CLIENT_SECRET!,
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    LINE,
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, phone: true, member: { select: { id: true, isActive: true, expiresAt: true } } },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.phone = dbUser.phone ?? undefined;
          session.user.member = dbUser.member ?? undefined;
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // 新用戶建立後，可以發送歡迎郵件等
      console.log("New user created:", user.email);
    },
  },
});
