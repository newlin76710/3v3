import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "STAFF" | "MEMBER";
      phone?: string;
      member?: {
        id: string;
        isActive: boolean;
        expiresAt: Date;
      };
    } & DefaultSession["user"];
  }
}
