export type InAppBrowser =
  | "line"
  | "wechat"
  | "facebook"
  | "instagram"
  | "android-webview"
  | "ios-webview"
  | null;

// 偵測常見會擋掉 Google OAuth 的 App 內建瀏覽器 (disallowed_useragent)
export function detectInAppBrowser(ua: string): InAppBrowser {
  if (/\bLine\//i.test(ua)) return "line";
  if (/MicroMessenger/i.test(ua)) return "wechat";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return "android-webview";
  if (
    /iPhone|iPad|iPod/i.test(ua) &&
    !/Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  ) {
    return "ios-webview";
  }
  return null;
}

// LINE 內建瀏覽器支援此參數,會自動改用系統預設瀏覽器開啟
export function withOpenExternalBrowser(url: string): string {
  const u = new URL(url);
  u.searchParams.set("openExternalBrowser", "1");
  return u.toString();
}

// 一般 Android WebView 用 intent scheme 強制叫起 Chrome
export function androidChromeIntentUrl(url: string): string {
  const u = new URL(url);
  const rest = `${u.host}${u.pathname}${u.search}`;
  return `intent://${rest}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;end`;
}

// 可自動跳出的類型;其餘(wechat/facebook/instagram/ios-webview)只能引導使用者手動操作
export function canAutoEscape(type: InAppBrowser): boolean {
  return type === "line" || type === "android-webview";
}

export function escapeInAppBrowser(type: InAppBrowser) {
  if (typeof window === "undefined") return;
  if (type === "line") {
    window.location.href = withOpenExternalBrowser(window.location.href);
  } else if (type === "android-webview") {
    window.location.href = androidChromeIntentUrl(window.location.href);
  }
}
