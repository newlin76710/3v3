"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminCreateRegistration, adminUpdateRegistration } from "@/app/actions/admin";
import { calculatePlayerFee, formatCurrency } from "@/lib/utils";
import { differenceInYears } from "date-fns";
import DateSelectPicker from "@/components/ui/date-select";
import { Loader2, Users, Info } from "lucide-react";

type EventWithGroups = {
  id: string;
  name: string;
  date: Date | string;
  groups: Array<{
    id: string;
    name: string;
    minTotalAge: number;
    minIndividualAge: number;
    allowedGenders: string[];
    maxTeams: number;
    _count: { registrations: number };
  }>;
};

type PlayerData = {
  id?: string;
  name: string;
  nationalId: string;
  birthday: string;
  phone: string;
  email: string;
  gender: "MALE" | "FEMALE" | "";
  emergencyContact: string;
  emergencyPhone: string;
  memberStatus: "ACTIVE_MEMBER" | "NEW_MEMBER" | "NON_MEMBER";
};

const NATIONAL_ID_RE = /^[A-Z][12]\d{8}$/;

const emptyPlayer = (): PlayerData => ({
  name: "", nationalId: "", birthday: "", phone: "",
  email: "", gender: "", emergencyContact: "", emergencyPhone: "",
  memberStatus: "NON_MEMBER",
});

const genderTypeLabels: Record<string, string> = {
  MALE_TRIPLE: "男3P", FEMALE_TRIPLE: "女3P", MIXED: "混3P",
};

interface Props {
  events: EventWithGroups[];
  mode: "create";
  defaultEventId?: string;
  defaultGroupId?: string;
}

interface EditProps {
  events: EventWithGroups[];
  mode: "edit";
  registrationId: string;
  defaultEventId: string;
  defaultGroupId: string;
  defaultTeamName: string;
  defaultGenderType: string;
  defaultPaymentStatus: string;
  defaultNotes: string;
  defaultTransferLastFive: string;
  defaultTransferDate: string;
  defaultPlayers: PlayerData[];
}

export default function AdminRegistrationForm(props: Props | EditProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState(
    props.defaultEventId ?? props.events[0]?.id ?? ""
  );
  const selectedEvent = props.events.find((e) => e.id === selectedEventId);
  const groups = selectedEvent?.groups ?? [];

  const [selectedGroupId, setSelectedGroupId] = useState(
    props.defaultGroupId ?? groups[0]?.id ?? ""
  );
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const [teamName, setTeamName] = useState(props.mode === "edit" ? props.defaultTeamName : "");
  const [genderType, setGenderType] = useState(props.mode === "edit" ? props.defaultGenderType : "");
  const [paymentStatus, setPaymentStatus] = useState(
    props.mode === "edit" ? props.defaultPaymentStatus : "PENDING"
  );
  const [notes, setNotes] = useState(props.mode === "edit" ? props.defaultNotes : "");
  const [transferLastFive, setTransferLastFive] = useState(
    props.mode === "edit" ? props.defaultTransferLastFive : ""
  );
  const [transferDate, setTransferDate] = useState(
    props.mode === "edit" ? props.defaultTransferDate : ""
  );
  const [players, setPlayers] = useState<PlayerData[]>(
    props.mode === "edit" ? props.defaultPlayers : [emptyPlayer(), emptyPlayer(), emptyPlayer()]
  );

  const eventDate = selectedEvent ? new Date(selectedEvent.date) : new Date();

  const getAge = (birthday: string) =>
    birthday ? differenceInYears(eventDate, new Date(birthday)) : null;

  const getFee = (p: PlayerData) => calculatePlayerFee(p.memberStatus, false);

  const totalFee = players.reduce((s, p) => s + getFee(p), 0);

  const updatePlayer = (index: number, field: keyof PlayerData, value: string) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validate = (): string | null => {
    if (!selectedEventId) return "請選擇賽事";
    if (!selectedGroupId) return "請選擇組別";
    if (!teamName || teamName.length > 6) return "隊名1-6個字";
    if (!genderType) return "請選擇組別性別";
    if (transferLastFive && !/^\d{5}$/.test(transferLastFive)) return "匯款末五碼必須是5位數字";
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.name) return `第 ${i + 1} 位選手請填姓名`;
      if (!NATIONAL_ID_RE.test(p.nationalId)) return `第 ${i + 1} 位選手身分證格式有誤`;
      if (!p.birthday) return `第 ${i + 1} 位選手請填生日`;
      if (!p.phone) return `第 ${i + 1} 位選手請填手機`;
      if (!p.gender) return `第 ${i + 1} 位選手請選性別`;
    }
    const ids = players.map((p) => p.nationalId);
    if (new Set(ids).size !== ids.length) return "身分證字號不能重複";

    if (selectedGroup) {
      const ages = players.map((p) => getAge(p.birthday) ?? 0);
      const total = ages.reduce((a, b) => a + b, 0);
      const min = Math.min(...ages);
      if (selectedGroup.minTotalAge > 0 && total < selectedGroup.minTotalAge)
        return `總年齡不足 ${selectedGroup.minTotalAge} 歲（目前 ${total} 歲）`;
      if (selectedGroup.minIndividualAge > 0 && min < selectedGroup.minIndividualAge)
        return `有選手年齡不足 ${selectedGroup.minIndividualAge} 歲`;
    }
    if (genderType === "MALE_TRIPLE" && !players.every((p) => p.gender === "MALE"))
      return "男3P必須3位男性選手";
    if (genderType === "FEMALE_TRIPLE" && !players.every((p) => p.gender === "FEMALE"))
      return "女3P必須3位女性選手";
    if (genderType === "MIXED") {
      const m = players.filter((p) => p.gender === "MALE").length;
      const f = players.filter((p) => p.gender === "FEMALE").length;
      if (!((m === 2 && f === 1) || (m === 1 && f === 2))) return "混3P必須2男1女或1男2女";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const playerData = players.map((p) => ({
        ...p,
        gender: p.gender as "MALE" | "FEMALE",
      }));

      let result;
      if (props.mode === "edit") {
        result = await adminUpdateRegistration(props.registrationId, {
          teamName,
          genderType: genderType as "MALE_TRIPLE" | "FEMALE_TRIPLE" | "MIXED",
          paymentStatus: paymentStatus as "PENDING" | "CONFIRMING" | "PAID" | "CANCELLED",
          notes,
          transferLastFive,
          transferDate,
          players: playerData,
        });
      } else {
        result = await adminCreateRegistration({
          eventId: selectedEventId,
          groupId: selectedGroupId,
          teamName,
          genderType: genderType as "MALE_TRIPLE" | "FEMALE_TRIPLE" | "MIXED",
          players: playerData,
          paymentStatus: paymentStatus as "PENDING" | "PAID",
          notes,
        });
      }

      if (result.error) toast.error(result.error);
      else {
        toast.success(props.mode === "edit" ? "報名已更新" : "報名已建立");
        router.push("/admin/registrations");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const genderTypeOptions = selectedGroup?.allowedGenders ?? [];

  return (
    <div className="space-y-6">
      {/* 賽事 & 組別 */}
      <Card>
        <CardHeader><CardTitle>賽事資訊</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {props.mode === "create" ? (
              <div>
                <Label>選擇賽事 *</Label>
                <Select
                  value={selectedEventId}
                  onValueChange={(v) => {
                    setSelectedEventId(v);
                    const ev = props.events.find((e) => e.id === v);
                    setSelectedGroupId(ev?.groups[0]?.id ?? "");
                    setGenderType("");
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {props.events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>賽事</Label>
                <Input
                  value={selectedEvent?.name ?? ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
            )}

            <div>
              <Label>選擇組別 *</Label>
              <Select
                value={selectedGroupId}
                onValueChange={(v) => { setSelectedGroupId(v); setGenderType(""); }}
                disabled={props.mode === "edit"}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}（{g._count.registrations}/{g.maxTeams}隊）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGroup && (
                <p className="text-xs text-gray-400 mt-1">
                  總年齡 {selectedGroup.minTotalAge}+ ｜ 最低年齡 {selectedGroup.minIndividualAge}+
                </p>
              )}
            </div>

            <div>
              <Label>隊名（最多6字）*</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={6}
                placeholder="請輸入隊名"
                className="mt-1"
              />
            </div>

            <div>
              <Label>付款狀態 *</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">未付款</SelectItem>
                  <SelectItem value="CONFIRMING">待確認</SelectItem>
                  <SelectItem value="PAID">已付款</SelectItem>
                  {props.mode === "edit" && (
                    <SelectItem value="CANCELLED">取消</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {props.mode === "edit" && (
              <>
                <div>
                  <Label>匯款末五碼</Label>
                  <Input
                    value={transferLastFive}
                    onChange={(e) => setTransferLastFive(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="請輸入5位數字"
                    maxLength={5}
                    inputMode="numeric"
                    className="mt-1 tracking-widest"
                  />
                </div>
                <div>
                  <Label>匯款日期</Label>
                  <DateSelectPicker
                    value={transferDate}
                    onChange={(v) => setTransferDate(v)}
                    minYear={new Date().getFullYear() - 2}
                    maxYear={new Date().getFullYear()}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <Label>組別性別 *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"] as const).map((gt) => {
                if (genderTypeOptions.length > 0 && !genderTypeOptions.includes(gt)) return null;
                const colors: Record<string, string> = {
                  MALE_TRIPLE: genderType === gt ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:border-blue-400",
                  FEMALE_TRIPLE: genderType === gt ? "bg-pink-600 text-white border-pink-600" : "border-gray-300 text-gray-700 hover:border-pink-400",
                  MIXED: genderType === gt ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-700 hover:border-purple-400",
                };
                return (
                  <button
                    key={gt}
                    type="button"
                    onClick={() => setGenderType(gt)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${colors[gt]}`}
                  >
                    {genderTypeLabels[gt]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>備註</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="後台備註（選填）"
              className="mt-1"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 選手資料 */}
      {players.map((player, index) => {
        const age = getAge(player.birthday);
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" />
                第 {index + 1} 位選手
                {age !== null && <Badge variant="outline" className="text-xs">{age} 歲</Badge>}
                <Badge variant="secondary" className="text-xs">{formatCurrency(getFee(player))}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>姓名 *</Label>
                  <Input value={player.name} onChange={(e) => updatePlayer(index, "name", e.target.value)}
                    placeholder="真實姓名" className="mt-1" />
                </div>
                <div>
                  <Label>性別 *</Label>
                  <Select value={player.gender} onValueChange={(v) => updatePlayer(index, "gender", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="請選擇" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">男</SelectItem>
                      <SelectItem value="FEMALE">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>身分證字號 *</Label>
                  <Input
                    value={player.nationalId}
                    onChange={(e) => updatePlayer(index, "nationalId", e.target.value.toUpperCase())}
                    placeholder="A123456789"
                    maxLength={10}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>出生日期 *</Label>
                  <DateSelectPicker
                    value={player.birthday}
                    onChange={(v) => updatePlayer(index, "birthday", v)}
                    maxYear={new Date().getFullYear()}
                    className="mt-1"
                  />
                  {age !== null && <p className="text-xs text-gray-500 mt-1">比賽當日年齡：{age} 歲</p>}
                </div>
                <div>
                  <Label>手機號碼 *</Label>
                  <Input value={player.phone} onChange={(e) => updatePlayer(index, "phone", e.target.value)}
                    placeholder="09xxxxxxxx" className="mt-1" />
                </div>
                <div>
                  <Label>電子信箱（選填）</Label>
                  <Input value={player.email} onChange={(e) => updatePlayer(index, "email", e.target.value)}
                    placeholder="your@email.com" type="email" className="mt-1" />
                </div>
                <div>
                  <Label>緊急聯絡人</Label>
                  <Input value={player.emergencyContact}
                    onChange={(e) => updatePlayer(index, "emergencyContact", e.target.value)}
                    placeholder="緊急聯絡人姓名（選填）" className="mt-1" />
                </div>
                <div>
                  <Label>緊急聯絡電話</Label>
                  <Input value={player.emergencyPhone}
                    onChange={(e) => updatePlayer(index, "emergencyPhone", e.target.value)}
                    placeholder="緊急聯絡電話（選填）" className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label>會員資格 *</Label>
                  <Select value={player.memberStatus} onValueChange={(v) => updatePlayer(index, "memberStatus", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE_MEMBER">有效協會會員（NT$ 200）</SelectItem>
                      <SelectItem value="NEW_MEMBER">新加入會員（NT$ 700）</SelectItem>
                      <SelectItem value="NON_MEMBER">非會員（NT$ 450）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* 費用 & 提交 */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {players.every((p) => p.birthday) && selectedGroup && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span>選手年齡（以比賽日計算）：</span>
                <span>{players.map((p) => getAge(p.birthday) ?? "?").join(" + ")} 歲</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>總年齡：</span>
                <span className={
                  players.reduce((s, p) => s + (getAge(p.birthday) ?? 0), 0) < selectedGroup.minTotalAge
                    ? "text-red-600" : "text-green-600"
                }>
                  {players.reduce((s, p) => s + (getAge(p.birthday) ?? 0), 0)} 歲（需 {selectedGroup.minTotalAge}+）
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1 text-sm">
            {players.map((p, i) => (
              <div key={i} className="flex justify-between text-gray-600">
                <span>{p.name || `第${i + 1}位選手`}</span>
                <span>{formatCurrency(getFee(p))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>應繳總金額</span>
              <span className="text-blue-600">{formatCurrency(totalFee)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">取消</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
              {loading ? "送出中..." : props.mode === "edit" ? "更新報名" : "建立報名"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
