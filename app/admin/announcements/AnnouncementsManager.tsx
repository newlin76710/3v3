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
import { createAnnouncement } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Eye, EyeOff } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  author: { name: string | null } | null;
};

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementsManager({ announcements }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) { toast.error("請填寫標題與內容"); return; }
    setLoading(true);
    try {
      await createAnnouncement(title, content, isPublished);
      toast.success("公告已建立！");
      setShowForm(false);
      setTitle("");
      setContent("");
      router.refresh();
    } catch {
      toast.error("建立失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新增公告
        </Button>
      ) : (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-gray-900 mb-4">新增公告</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>標題 *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>內容 *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pub"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <Label htmlFor="pub">立即發布</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                  {loading ? "建立中..." : "建立公告"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {announcements.map((ann) => (
        <Card key={ann.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                  <Badge variant={ann.isPublished ? "success" : "secondary"}>
                    {ann.isPublished ? (
                      <><Eye className="w-3 h-3 mr-1" />已發布</>
                    ) : (
                      <><EyeOff className="w-3 h-3 mr-1" />草稿</>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(ann.createdAt)}
                  {ann.author && ` ｜ ${ann.author.name}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
