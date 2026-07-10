"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { previewBroadcastRecipients, sendBroadcastEmail } from "@/app/actions/emailBroadcast";
import { SCOPE_LABELS, SEGMENT_LABELS } from "@/lib/email-broadcast-labels";
import { formatDate } from "@/lib/utils";
import { Send, Loader2, Users } from "lucide-react";
import type { EmailAudienceScope, EmailAudienceSegment } from "@prisma/client";

type HistoryItem = {
  id: string;
  subject: string;
  scope: EmailAudienceScope;
  segment: EmailAudienceSegment;
  recipientCount: number;
  createdAt: Date;
  sentBy: { name: string | null; email: string | null } | null;
};

interface Props {
  history: HistoryItem[];
}

const SCOPE_OPTIONS = Object.entries(SCOPE_LABELS) as [EmailAudienceScope, string][];
const SEGMENT_OPTIONS = Object.entries(SEGMENT_LABELS) as [EmailAudienceSegment, string][];

export default function EmailBroadcastManager({ history }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<EmailAudienceScope>("ALL");
  const [segment, setSegment] = useState<EmailAudienceSegment>("EVERYONE");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const updateScope = (value: EmailAudienceScope) => {
    setScope(value);
    setPreviewCount(null);
  };

  const updateSegment = (value: EmailAudienceSegment) => {
    setSegment(value as EmailAudienceSegment);
    setPreviewCount(null);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const result = await previewBroadcastRecipients(scope, segment);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPreviewCount(result.count ?? 0);
      }
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("請填寫主旨與內容");
      return;
    }

    setSending(true);
    try {
      let count = previewCount;
      if (count === null) {
        const result = await previewBroadcastRecipients(scope, segment);
        if (result.error) { toast.error(result.error); return; }
        count = result.count ?? 0;
        setPreviewCount(count);
      }

      if (count === 0) { toast.error("找不到符合條件的收件人"); return; }

      if (!confirm(`確定寄送給 ${count} 位收件人？此操作無法復原。`)) return;

      const result = await sendBroadcastEmail({ subject, content, scope, segment });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`已成功寄送給 ${result.recipientCount} 位收件人`);
        setSubject("");
        setContent("");
        setPreviewCount(null);
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">發送群發信件</h2>

          <div>
            <Label>主旨 *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="請輸入信件主旨" />
          </div>

          <div>
            <Label>內容 *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="mt-1"
              placeholder="請輸入信件內容（純文字，換行會自動保留）"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>收件範圍</Label>
              <Select value={scope} onValueChange={(v) => updateScope(v as EmailAudienceScope)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>篩選條件</Label>
              <Select value={segment} onValueChange={(v) => updateSegment(v as EmailAudienceSegment)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENT_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing} className="gap-2">
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              預覽收件人數
            </Button>
            {previewCount !== null && (
              <span className="text-sm text-gray-600">
                符合條件：<span className="font-semibold text-gray-900">{previewCount}</span> 人
              </span>
            )}
          </div>

          <div>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "寄送中..." : "發送信件"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">發送紀錄</h2>
        <div className="space-y-3">
          {history.length === 0 && (
            <p className="text-sm text-gray-400">尚無發送紀錄</p>
          )}
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-gray-900">{item.subject}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary">{SCOPE_LABELS[item.scope]}</Badge>
                      <Badge variant="outline">{SEGMENT_LABELS[item.segment]}</Badge>
                      <span className="text-xs text-gray-500">{item.recipientCount} 位收件人</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(item.createdAt, "yyyy/MM/dd HH:mm")}
                    {item.sentBy?.name && ` ｜ ${item.sentBy.name}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
