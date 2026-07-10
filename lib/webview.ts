export type MobileOS = "ios" | "android" | null;
export type InAppBrowser = "line" | "wechat" | "facebook" | "instagram" | "generic" | null;

const ESCAPE_PARAM = "nb"; // native-browser marker，避免跳出後又重複跳一次

const APP_TOKENS: Array<{ key: Exclude<InAppBrowser, "generic" | null>; test: RegExp }> = [
  { key: "line", test: /\bLine\// },
  { key: "wechat", test: /MicroMessenger/i },
  { key: "facebook", test: /FBAN|FBAV|FB_IAB/i },
  { key: "instagram", test: /Instagram/i },
];

export function getMobileOS(ua: string): MobileOS {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

// 真正的 Safari 一定同時帶 Version/x.x 與 Safari/x.x；
// App 內建的 WKWebView 大多仍會帶 Safari/ 字串，但沒有 Version/，用這個才分得出來。
function isRealSafari(ua: string): boolean {
  return /Version\/[\d.]+.*Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

// 真正的 Chrome / Firefox / Samsung Internet 等，且不是內嵌 WebView（UA 含 "; wv)"）
function isRealAndroidBrowser(ua: string): boolean {
  if (/;\s*wv\)/i.test(ua)) return false;
  return /Chrome\/|Firefox\/|SamsungBrowser\/|EdgA\//i.test(ua);
}

// 偵測是否為會擋掉 Google OAuth 的內建瀏覽器（disallowed_useragent）
export function detectInAppBrowser(ua: string): InAppBrowser {
  for (const { key, test } of APP_TOKENS) {
    if (test.test(ua)) return key;
  }
  const os = getMobileOS(ua);
  if (os === "ios" && !isRealSafari(ua)) return "generic";
  if (os === "android" && !isRealAndroidBrowser(ua)) return "generic";
  return null;
}

export function hasEscapeMarker(url: string): boolean {
  try {
    return new URL(url).searchParams.get(ESCAPE_PARAM) === "1";
  } catch {
    return false;
  }
}

function withEscapeMarker(url: string): string {
  const u = new URL(url);
  u.searchParams.set(ESCAPE_PARAM, "1");
  return u.toString();
}

// iOS 的 Safari 會註冊 x-safari-https / x-safari-http 這兩個 scheme，
// 從任何 App 的 WKWebView 導向這個 scheme 都會強制用 Safari 開啟該網址。
function toSafariScheme(url: string): string {
  return url.replace(/^(https?):\/\//i, "x-safari-$1://");
}

// Android intent scheme，不指定 package，讓系統照使用者設定的預設瀏覽器開啟
function toAndroidIntentUrl(url: string): string {
  const u = new URL(url);
  const rest = `${u.host}${u.pathname}${u.search}`;
  return `intent://${rest}#Intent;scheme=${u.protocol.replace(":", "")};end`;
}

// 回傳可自動跳轉的網址；WeChat 會主動封鎖這類跳轉，回傳 null 交給呼叫端顯示手動引導
export function buildEscapeUrl(type: InAppBrowser, os: MobileOS, currentUrl: string): string | null {
  if (!os || type === "wechat") return null;
  const marked = withEscapeMarker(currentUrl);
  if (os === "ios") return toSafariScheme(marked);
  if (os === "android") return toAndroidIntentUrl(marked);
  return null;
}
