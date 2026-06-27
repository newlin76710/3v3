import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import LINE from "next-auth/providers/line";
import { prisma } from "@/lib/prisma";

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
    LINE({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
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
      console.log("New user created:", user.email);
      // 新用戶建立時，自動關聯以 email 建立的孤立 Member（由報名流程產生）
      if (user.email && user.id) {
        try {
          const orphaned = await prisma.member.findFirst({
            where: { email: user.email, userId: null },
          });
          if (orphaned) {
            await prisma.member.update({
              where: { id: orphaned.id },
              data: { userId: user.id },
            });
          }
        } catch {
          // 關聯失敗不影響帳號建立
        }
      }
    },
  },
});
