"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEvent } from "@/app/actions/event";
import DateSelectPicker from "@/components/ui/date-select";
import { Loader2 } from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    date: "",
    location: "",
    registrationStart: "",
    registrationEnd: "",
    poster: "",
    description: "",
    isOpen: false,
    maxTeamsPerGroup: 16,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.date || !form.location) {
      toast.error("請填寫必填欄位");
      return;
    }
    setLoading(true);
    try {
      const result = await createEvent({
        ...form,
        maxTeamsPerGroup: Number(form.maxTeamsPerGroup),
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("賽事建立成功！");
        router.push(`/admin/events/${result.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("建立失敗，請檢查資料庫連線或稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/events" className="text-gray-400 hover:text-gray-600">← 賽事列表</a>
        <h1 className="text-2xl font-bold text-gray-900">新增賽事</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>賽事基本資訊</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>賽事名稱 *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: f.slug || autoSlug(e.target.value),
                  }));
                }}
                placeholder="例：第一屆中華台北羽球3對3全國錦標賽"
                className="mt-1"
              />
            </div>

            <div>
              <Label>URL Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="例：first-national-championship"
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                用於網址，只能包含小寫字母、數字和連字號
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>比賽日期 *</Label>
                <DateSelectPicker
                  value={form.date}
                  onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                  minYear={new Date().getFullYear() - 10}
                  maxYear={new Date().getFullYear() + 10}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>比賽地點 *</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="例：臺北體育館 7樓羽球館"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>報名開始日期 *</Label>
                <DateSelectPicker
                  value={form.registrationStart}
                  onChange={(v) => setForm((f) => ({ ...f, registrationStart: v }))}
                  minYear={new Date().getFullYear() - 10}
                  maxYear={new Date().getFullYear() + 10}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>報名截止日期 *</Label>
                <DateSelectPicker
                  value={form.registrationEnd}
                  onChange={(v) => setForm((f) => ({ ...f, registrationEnd: v }))}
                  minYear={new Date().getFullYear() - 10}
                  maxYear={new Date().getFullYear() + 10}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>海報圖片URL（選填）</Label>
              <Input
                value={form.poster}
                onChange={(e) => setForm((f) => ({ ...f, poster: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>賽事說明（選填）</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="賽事詳細說明..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isOpen"
                checked={form.isOpen}
                onChange={(e) => setForm((f) => ({ ...f, isOpen: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="isOpen">立即開放（建立後即可在前台顯示）</Label>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              {loading ? "建立中..." : "建立賽事"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
