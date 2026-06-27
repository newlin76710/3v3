"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateEvent, createEventGroup, deleteEventGroup } from "@/app/actions/event";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Users, Trash2 } from "lucide-react";

type Group = {
  id: string;
  name: string;
  minTotalAge: number;
  minIndividualAge: number;
  allowedGenders: string[];
  maxTeams: number;
  _count: { registrations: number };
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

export default function EventAdminManager({ event }: Props) {
  const router = useRouter();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
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
      {/* 賽事資訊 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>賽事設定</CardTitle>
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
        </CardHeader>
        <CardContent>
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
          </div>
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
          {event.groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{group.name}</h3>
                      <div className="flex gap-1">
                        {group.allowedGenders.map((g) => (
                          <Badge key={g} variant="outline" className="text-xs">{genderLabel[g]}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-x-3">
                      <span>總年齡 {group.minTotalAge}+</span>
                      <span>個人 {group.minIndividualAge}+</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Users className="w-4 h-4 text-gray-400" />
                        {group._count.registrations} / {group.maxTeams}
                      </div>
                      {group._count.registrations >= group.maxTeams && (
                        <Badge variant="destructive" className="text-xs mt-1">額滿</Badge>
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
          ))}
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
