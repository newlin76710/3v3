import type { EmailAudienceScope, EmailAudienceSegment } from "@prisma/client";

export const SCOPE_LABELS: Record<EmailAudienceScope, string> = {
  ALL: "網站會員 + 未認領帳號的入會資料",
  USERS_ONLY: "僅網站會員",
};

export const SEGMENT_LABELS: Record<EmailAudienceSegment, string> = {
  EVERYONE: "全部",
  ASSOCIATION_MEMBER: "協會會員",
  PAID: "已繳費",
  UNPAID: "未繳費",
  REGISTERED: "已報名賽事",
  NOT_REGISTERED: "未報名賽事",
};
