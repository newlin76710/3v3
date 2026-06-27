import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInYears, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(birthday: Date): number {
  return differenceInYears(new Date(), birthday);
}

export function formatDate(date: Date | string, pattern = "yyyy/MM/dd"): string {
  return format(new Date(date), pattern);
}

export function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`;
}

export function generateMemberNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `M${year}${random}`;
}

// 計算報名費
// isSecondItem: 同選手在同賽事的第2筆報名（第2組別）
export function calculatePlayerFee(
  memberStatus: "ACTIVE_MEMBER" | "NEW_MEMBER" | "NON_MEMBER",
  isSecondItem: boolean = false
): number {
  if (isSecondItem) {
    // 第2項：會員已含在首次200/700內，非會員再收450（合計900）
    return memberStatus === "NON_MEMBER" ? 450 : 0;
  }
  switch (memberStatus) {
    case "ACTIVE_MEMBER": return 200;
    case "NEW_MEMBER":    return 700;
    case "NON_MEMBER":    return 450;
  }
}

export function validateNationalId(id: string): boolean {
  // 台灣身分證字號驗證
  const pattern = /^[A-Z][12]\d{8}$/;
  if (!pattern.test(id)) return false;

  const letterMap: Record<string, number> = {
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18,
    K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27,
    U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
  };

  const n = letterMap[id[0]];
  const digits = [Math.floor(n / 10), n % 10, ...id.slice(1).split("").map(Number)];
  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  return sum % 10 === 0;
}

export const BANK_INFO = {
  bankName: "中國信託",
  bankCode: "822",
  accountNumber: "178540107748",
  accountName: "林成翰",
};

export const MEMBERSHIP_FEE = 500;
export const MEMBERSHIP_DURATION_YEARS = 1;
