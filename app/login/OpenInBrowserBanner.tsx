"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import {
  canAutoEscape,
  detectInAppBrowser,
  escapeInAppBrowser,
  type InAppBrowser,
} from "@/lib/webview";

const LABELS: Record<Exclude<InAppBrowser, null>, string> = {
  line: "LINE",
  wechat: "微信 WeChat",
  facebook: "Facebook",
  instagram: "Instagram",
  "android-webview": "App 內建瀏覽器",
  "ios-webview": "App 內建瀏覽器",
};

export default function OpenInBrowserBanner() {
  const [type, setType] = useState<InAppBrowser>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setType(detectInAppBrowser(navigator.userAgent));
  }, []);

  if (!type || dismissed) return null;

  const handleClick = () => {
    if (canAutoEscape(type)) {
      escapeInAppBrowser(type);
    } else {
      setShowGuide(true);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          偵測到您正在 {LABELS[type]} 內建瀏覽器中,Google 登入可能會失敗。
          <button onClick={handleClick} className="ml-1 font-semibold underline">
            點此在瀏覽器開啟
          </button>
        </div>
        <button onClick={() => setDismissed(true)} aria-label="關閉">
          <X className="w-4 h-4" />
        </button>
      </div>
      {showGuide && (
        <div className="mt-2 pl-6 text-amber-700">
          請點選右上角「⋯」選單，選擇「在瀏覽器中開啟」，或複製此頁網址貼到 Safari / Chrome 開啟後再登入。
        </div>
      )}
    </div>
  );
}
