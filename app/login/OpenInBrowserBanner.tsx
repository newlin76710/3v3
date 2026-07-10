"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  buildEscapeUrl,
  detectInAppBrowser,
  getMobileOS,
  hasEscapeMarker,
} from "@/lib/webview";

type Status = "redirecting" | "guide" | null;

export default function OpenInBrowserBanner() {
  const [status, setStatus] = useState<Status>(null);
  const [escapeUrl, setEscapeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (hasEscapeMarker(window.location.href)) return; // 已經跳出過一次，避免無限跳轉

    const ua = navigator.userAgent;
    const type = detectInAppBrowser(ua);
    if (!type) return;

    const os = getMobileOS(ua);
    const url = buildEscapeUrl(type, os, window.location.href);

    if (!url) {
      setStatus("guide");
      return;
    }

    setEscapeUrl(url);
    setStatus("redirecting");
    window.location.href = url;
  }, []);

  if (!status) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
        {status === "redirecting" ? (
          <div className="flex-1">
            偵測到您正在 App 內建瀏覽器中，正在為您開啟系統預設瀏覽器…
            {escapeUrl && (
              <button
                onClick={() => (window.location.href = escapeUrl)}
                className="ml-1 font-semibold underline"
              >
                沒有反應？點此重試
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1">
            偵測到您正在 App 內建瀏覽器中，Google 登入可能會失敗。請點選右上角「⋯」選單，選擇「在瀏覽器中開啟」，或複製此頁網址貼到 Safari / Chrome 開啟後再登入。
          </div>
        )}
      </div>
    </div>
  );
}
