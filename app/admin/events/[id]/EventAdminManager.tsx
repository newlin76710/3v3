"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateEvent, createEventGroup, deleteEventGroup } from "@/app/actions/event";
import { formatDate } from "@/lib/utils";
import DateSelectPicker from "@/components/ui/date-select";
import { Plus, Loader2, Users, Trash2, Pencil, X } from "lucide-react";

type Group = {
  id: string;
  name: string;
  minTotalAge: number;
  minIndividualAge: number;
  allowedGenders: string[];
  maxTeams: number;
  genderCounts: Record<string, number>;
};

type Event = {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  date: Date;
  location: string;
  registrationStart: Date;
  registrationEnd: Date;
  poster: string | null;
  description: string | null;
  groups: Group[];
};

interface Props {
  event: Event;
}

const genderLabel: Record<string, string> = {
  MALE_TRIPLE: "男3P",
  FEMALE_TRIPLE: "女3P",
  MIXED: "混3P",
};

function toDateInput(d: Date): string {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export default function EventAdminManager({ event }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editForm, setEditForm] = useState({
    name: event.name,
    slug: event.slug,
    date: toDateInput(event.date),
    location: event.location,
    registrationStart: toDateInput(event.registrationStart),
    registrationEnd: toDateInput(event.registrationEnd),
    poster: event.poster ?? "",
    description: event.description ?? "",
  });

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    minTotalAge: 150,
    minIndividualAge: 45,
    allowedGenders: [] as string[],
    maxTeams: 16,
  });

  const toggleEventOpen = async () => {
    setToggling(true);
    const result = await updateEvent(event.id, { isOpen: !event.isOpen });
    if (result.error) toast.error(result.error);
    else { toast.success(event.isOpen ? "已關閉報名" : "已開放報名"); router.refresh(); }
    setToggling(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.slug || !editForm.date || !editForm.location) {
      toast.error("請填寫必填欄位");
      return;
    }
    setSaving(true);
    const result = await updateEvent(event.id, editForm);
    if (result.error) toast.error(result.error);
    else {
      toast.success("賽事資料已儲存");
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name || newGroup.allowedGenders.length === 0) {
      toast.error("請填寫組別名稱並選擇性別組");
      return;
    }
    setLoading(true);
    const result = await createEventGroup({
      ...newGroup,
      eventId: event.id,
      allowedGenders: newGroup.allowedGenders as ("MALE_TRIPLE" | "FEMALE_TRIPLE" | "MIXED")[],
    });
    if (result.error) toast.error(result.error);
    else { toast.success("組別已建立！"); setShowGroupForm(false); router.refresh(); }
    setLoading(false);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`確定要刪除「${groupName}」組別嗎？`)) return;
    setDeletingGroupId(groupId);
    const result = await deleteEventGroup(groupId);
    if (result.error) toast.error(result.error);
    else { toast.success("組別已刪除"); router.refresh(); }
    setDeletingGroupId(null);
  };

  const toggleGender = (gender: string) => {
    setNewGroup((prev) => ({
      ...prev,
      allowedGenders: prev.allowedGenders.includes(gender)
        ? prev.allowedGenders.filter((g) => g !== gender)
        : [...prev.allowedGenders, gender],
    }));
  };

  return (
    <div className="space-y-6">
      {/* 賽事設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>賽事設定</CardTitle>
            <div className="flex gap-2">
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                  <Pencil className="w-3.5 h-3.5" />
                  編輯
                </Button>
              )}
              <Button
                onClick={toggleEventOpen}
                disabled={toggling}
                variant={event.isOpen ? "destructive" : "default"}
                size="sm"
              >
                {toggling ? <Loader2 className="animate-spin mr-1 w-3 h-3" /> : null}
                {event.isOpen ? "關閉報名" : "開放報名"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>賽事名稱 *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>URL Slug *</Label>
                  <Input
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>比賽日期 *</Label>
                  <DateSelectPicker
                    value={editForm.date}
                    onChange={(v) => setEditForm((f) => ({ ...f, date: v }))}
                    minYear={new Date().getFullYear() - 10}
                    maxYear={new Date().getFullYear() + 10}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>比賽地點 *</Label>
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>報名開始</Label>
                  <DateSelectPicker
                    value={editForm.registrationStart}
                    onChange={(v) => setEditForm((f) => ({ ...f, registrationStart: v }))}
                    minYear={new Date().getFullYear() - 10}
                    maxYear={new Date().getFullYear() + 10}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>報名截止</Label>
                  <DateSelectPicker
                    value={editForm.registrationEnd}
                    onChange={(v) => setEditForm((f) => ({ ...f, registrationEnd: v }))}
                    minYear={new Date().getFullYear() - 10}
                    maxYear={new Date().getFullYear() + 10}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>海報圖片 URL</Label>
                <Input
                  value={editForm.poster}
                  onChange={(e) => setEditForm((f) => ({ ...f, poster: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>賽事說明</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin mr-1 w-3 h-3" /> : null}
                  儲存
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditForm({
                      name: event.name,
                      slug: event.slug,
                      date: toDateInput(event.date),
                      location: event.location,
                      registrationStart: toDateInput(event.registrationStart),
                      registrationEnd: toDateInput(event.registrationEnd),
                      poster: event.poster ?? "",
                      description: event.description ?? "",
                    });
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">狀態：</span>
                <Badge variant={event.isOpen ? "success" : "secondary"}>
                  {event.isOpen ? "開放" : "關閉"}
                </Badge>
              </div>
              <div><span className="text-gray-500">比賽日期：</span>{formatDate(event.date)}</div>
              <div><span className="text-gray-500">地點：</span>{event.location}</div>
              <div><span className="text-gray-500">報名期間：</span>
                {formatDate(event.registrationStart)} ~ {formatDate(event.registrationEnd)}
              </div>
              {event.poster && (
                <div className="sm:col-span-2">
                  <span className="text-gray-500">海報：</span>
                  <a href={event.poster} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                    {event.poster}
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 組別列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">參賽組別（{event.groups.length} 組）</h2>
          <Button onClick={() => setShowGroupForm(!showGroupForm)} size="sm" className="gap-1">
            <Plus className="w-3.5 h-3.5" />
            新增組別
          </Button>
        </div>

        {showGroupForm && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>組別名稱 *</Label>
                    <Input
                      value={newGroup.name}
                      onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
                      placeholder="例：A組"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>最多隊數</Label>
                    <Input
                      type="number"
                      value={newGroup.maxTeams}
                      onChange={(e) => setNewGroup((p) => ({ ...p, maxTeams: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>最低總年齡</Label>
                    <Input
                      type="number"
                      value={newGroup.minTotalAge}
                      onChange={(e) => setNewGroup((p) => ({ ...p, minTotalAge: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>最低個人年齡</Label>
                    <Input
                      type="number"
                      value={newGroup.minIndividualAge}
                      onChange={(e) => setNewGroup((p) => ({ ...p, minIndividualAge: Number(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>可選性別組 *</Label>
                  <div className="flex gap-2 mt-2">
                    {["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGender(g)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          newGroup.allowedGenders.includes(g)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 text-gray-700"
                        }`}
                      >
                        {genderLabel[g]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-1 w-3 h-3" /> : null}
                    建立組別
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowGroupForm(false)}>
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {event.groups.map((group) => {
            const groupTotal = group.allowedGenders.reduce(
              (sum, g) => sum + (group.genderCounts[g] ?? 0),
              0
            );
            const groupCapacity = group.maxTeams * group.allowedGenders.length;
            return (
              <Card key={group.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{group.name}</h3>
                      </div>
                      <div className="text-sm text-gray-500 space-x-3">
                        <span>總年齡 {group.minTotalAge}+</span>
                        <span>個人 {group.minIndividualAge}+</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {group.allowedGenders.map((g) => {
                          const count = group.genderCounts[g] ?? 0;
                          const full = count >= group.maxTeams;
                          return (
                            <Badge key={g} variant={full ? "destructive" : "outline"} className="text-xs">
                              {genderLabel[g]} {count}/{group.maxTeams}{full ? " 額滿" : ""}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Users className="w-4 h-4 text-gray-400" />
                          {groupTotal} / {groupCapacity}
                        </div>
                        {groupTotal >= groupCapacity && (
                          <Badge variant="destructive" className="text-xs mt-1">全額滿</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        disabled={deletingGroupId === group.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                        title="刪除組別"
                      >
                        {deletingGroupId === group.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 前往報名列表 */}
      <div className="pt-2">
        <a
          href={`/admin/registrations?event=${event.id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          查看此賽事的報名列表 →
        </a>
      </div>
    </div>
  );
}
