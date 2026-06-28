import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import LINE from "next-auth/providers/line";
import { prisma } from "@/lib/prisma";

// 包裝 adapter，updateUser 時不覆蓋使用者已設定的 name / email / image
function protectedAdapter(base: Adapter): Adapter {
  return {
    ...base,
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, email: true, image: true },
      });
      if (current) {
        if (current.name)  delete user.name;
        if (current.email) delete user.email;
        if (current.image) delete user.image;
      }
      // 若刪完後沒有任何欄位需要更新，直接回傳現有使用者，避免 Prisma 空 data 錯誤
      const { id, ...rest } = user;
      if (Object.keys(rest).length === 0) {
        const existing = await prisma.user.findUnique({ where: { id } });
        return existing as AdapterUser;
      }
      return base.updateUser!(user);
    },
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: protectedAdapter(PrismaAdapter(prisma)),
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
      authorization: { params: { scope: "profile openid email" } },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email ?? null,
          image: profile.picture,
        };
      },
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // 補填空白的 email（首次登入若 provider 未回傳、或第二次才授權）
    async signIn({ user, account, profile }) {
      if (profile?.email && user.id && !user.email) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { email: profile.email as string },
          });
        } catch {
          // email 已被其他帳號使用，略過
        }
      }
      return true;
    },
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
    },
  },
});
