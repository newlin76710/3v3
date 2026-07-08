"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateMyRegistration, checkPlayerDuplicates, checkMemberships } from "@/app/actions/registration";
import { calculatePlayerFee, formatCurrency } from "@/lib/utils";
import { differenceInYears } from "date-fns";
import DateSelectPicker from "@/components/ui/date-select";
import { Loader2, AlertTriangle, CheckCircle, Users, Info, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Group = {
  id: string;
  name: string;
  minTotalAge: number;
  minIndividualAge: number;
  allowedGenders: string[];
  maxTeams: number;
  genderCounts: Record<string, number>;
};

type PlayerData = {
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

type DuplicateInfo = { isSecondItem: boolean; groupName: string | null } | null;

const NATIONAL_ID_RE = /^[A-Z][12]\d{8}$/;

const memberStatusLabel: Record<string, string> = {
  ACTIVE_MEMBER: "有效協會會員",
  NEW_MEMBER: "新加入會員（本次入會）",
  NON_MEMBER: "非會員",
};

interface Props {
  registrationId: string;
  event: { id: string; name: string; slug: string; date: Date | string };
  group: Group;
  defaultTeamName: string;
  defaultGenderType: string;
  defaultPlayers: PlayerData[];
}

export default function MemberRegistrationEditForm({
  registrationId, event, group, defaultTeamName, defaultGenderType, defaultPlayers,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [genderType, setGenderType] = useState<string>(defaultGenderType);
  const [players, setPlayers] = useState<PlayerData[]>(defaultPlayers);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([null, null, null]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [membershipCheck, setMembershipCheck] = useState<Record<string, boolean>>({});
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [validation, setValidation] = useState<string[]>([]);
  const [consentChecked, setConsentChecked] = useState(false);

  const eventDate = new Date(event.date);

  const getPlayerAge = (birthday: string): number | null => {
    if (!birthday) return null;
    return differenceInYears(eventDate, new Date(birthday));
  };

  const nationalIdKey = useMemo(
    () => players.map((p) => p.nationalId).join(","),
    [players]
  );

  useEffect(() => {
    const validIds = players.map((p) => p.nationalId).filter((id) => NATIONAL_ID_RE.test(id));
    if (validIds.length === 0) {
      setDuplicates([null, null, null]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const results = await checkPlayerDuplicates(validIds, event.id, registrationId);
        if (cancelled) return;
        setDuplicates(
          players.map((p) => {
            if (!NATIONAL_ID_RE.test(p.nationalId)) return null;
            const found = results.find((r) => r.nationalId === p.nationalId);
            return found ?? null;
          })
        );
      } finally {
        if (!cancelled) setCheckingDuplicates(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nationalIdKey, event.id, registrationId]);

  const memberStatusKey = useMemo(
    () => players.map((p) => `${p.nationalId}:${p.memberStatus}`).join(","),
    [players]
  );

  useEffect(() => {
    const toCheck = players
      .filter((p) => p.memberStatus === "ACTIVE_MEMBER" && NATIONAL_ID_RE.test(p.nationalId))
      .map((p) => p.nationalId);

    if (toCheck.length === 0) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingMembership(true);
      try {
        const results = await checkMemberships(toCheck);
        if (cancelled) return;
        setMembershipCheck((prev) => {
          const next = { ...prev };
          results.forEach(({ nationalId, isActiveMember }) => {
            next[nationalId] = isActiveMember;
          });
          return next;
        });
      } finally {
        if (!cancelled) setCheckingMembership(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [memberStatusKey]);

  const getPlayerFee = (player: PlayerData, index: number): number =>
    calculatePlayerFee(player.memberStatus, duplicates[index]?.isSecondItem ?? false);

  const calculateTotalFee = (): number =>
    players.reduce((sum, p, i) => sum + getPlayerFee(p, i), 0);

  const validateAll = (): string[] => {
    const errors: string[] = [];
    if (!teamName || teamName.length > 6) errors.push("隊名1-6個字");
    if (!genderType) errors.push("請選擇組別性別");

    const ids = players.map((p) => p.nationalId).filter(Boolean);
    if (new Set(ids).size !== ids.length) errors.push("身分證字號不能重複");

    players.forEach((p, i) => {
      if (
        p.memberStatus === "ACTIVE_MEMBER" &&
        NATIONAL_ID_RE.test(p.nationalId) &&
        membershipCheck[p.nationalId] === false
      ) {
        errors.push(`第 ${i + 1} 位選手（${p.nationalId}）目前非協會有效會員，請確認或選擇其他身分`);
      }
    });

    if (players.every((p) => p.birthday)) {
      const ages = players.map((p) => getPlayerAge(p.birthday) ?? 0);
      const totalAge = ages.reduce((a, b) => a + b, 0);
      const minAge = Math.min(...ages);
      if (group.minTotalAge > 0 && totalAge < group.minTotalAge)
        errors.push(`總年齡不足 ${group.minTotalAge} 歲（目前 ${totalAge} 歲）`);
      if (group.minIndividualAge > 0 && minAge < group.minIndividualAge)
        errors.push(`有選手年齡不足 ${group.minIndividualAge} 歲`);
      if (genderType === "MALE_TRIPLE" && !players.every((p) => p.gender === "MALE"))
        errors.push("男3P必須3位男性選手");
      if (genderType === "FEMALE_TRIPLE" && !players.every((p) => p.gender === "FEMALE"))
        errors.push("女3P必須3位女性選手");
      if (genderType === "MIXED") {
        const maleCount = players.filter((p) => p.gender === "MALE").length;
        const femaleCount = players.filter((p) => p.gender === "FEMALE").length;
        if (!((maleCount === 2 && femaleCount === 1) || (maleCount === 1 && femaleCount === 2)))
          errors.push("混3P必須2男1女或1男2女");
      }
    }
    return errors;
  };

  const updatePlayer = (index: number, field: keyof PlayerData, value: string) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  useEffect(() => {
    setValidation(validateAll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, genderType, teamName, membershipCheck]);

  const handleSubmit = async () => {
    const errors = validateAll();
    if (errors.length > 0) { toast.error(errors[0]); return; }
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.name || !p.nationalId || !p.birthday || !p.phone || !p.gender) {
        toast.error(`請完整填寫第 ${i + 1} 位選手資料`);
        return;
      }
    }
    setLoading(true);
    try {
      const result = await updateMyRegistration({
        registrationId,
        teamName,
        genderType: genderType as "MALE_TRIPLE" | "FEMALE_TRIPLE" | "MIXED",
        players: players.map((p) => ({
          ...p,
          gender: p.gender as "MALE" | "FEMALE",
          itemCount: 1,
        })),
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(`資料已更新！應繳金額 ${formatCurrency(result.totalAmount ?? 0)}`);
        router.push(`/member/payment?type=registration&id=${registrationId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const genderTypeOptions = group.allowedGenders;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>報名基本資訊</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>組別</Label>
              <p className="mt-1 h-10 flex items-center px-3 rounded-md border border-input bg-gray-50 text-sm text-gray-700">
                {group.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                總年齡 {group.minTotalAge}+ ｜ 最低年齡 {group.minIndividualAge}+（組別無法變更）
              </p>
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
              <p className="text-xs text-gray-400 mt-1">{teamName.length}/6 字</p>
            </div>
          </div>

          <div>
            <Label>組別性別 *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"].map((gt) => {
                if (!genderTypeOptions.includes(gt)) return null;
                const labels: Record<string, string> = { MALE_TRIPLE: "男3P", FEMALE_TRIPLE: "女3P", MIXED: "混3P" };
                const count = group.genderCounts?.[gt] ?? 0;
                const max = group.maxTeams ?? 0;
                const isFull = max > 0 && count >= max && genderType !== gt;
                const colors: Record<string, string> = {
                  MALE_TRIPLE: genderType === gt ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:border-blue-400",
                  FEMALE_TRIPLE: genderType === gt ? "bg-pink-600 text-white border-pink-600" : "border-gray-300 text-gray-700 hover:border-pink-400",
                  MIXED: genderType === gt ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-700 hover:border-purple-400",
                };
                return (
                  <button
                    key={gt}
                    type="button"
                    disabled={isFull}
                    onClick={() => !isFull && setGenderType(gt)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${colors[gt]} ${isFull ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {labels[gt]}（{count}/{max}）{isFull ? " 額滿" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>同一位選手最多可跨 2 個組別報名。填入身分證號後系統將自動偵測，並即時顯示第2項費用調整。</span>
          </div>
        </CardContent>
      </Card>

      {players.map((player, index) => {
        const age = getPlayerAge(player.birthday);
        const dup = duplicates[index];
        const fee = getPlayerFee(player, index);
        const memberCheckFailed =
          player.memberStatus === "ACTIVE_MEMBER" &&
          NATIONAL_ID_RE.test(player.nationalId) &&
          membershipCheck[player.nationalId] === false;

        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" />
                第 {index + 1} 位選手
                {age !== null && <Badge variant="outline" className="ml-2 text-xs">{age} 歲</Badge>}
                <Badge variant={dup?.isSecondItem ? "warning" : "secondary"} className="text-xs">
                  {formatCurrency(fee)}
                </Badge>
                {(checkingDuplicates || checkingMembership) && NATIONAL_ID_RE.test(player.nationalId) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                )}
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

                <div className="sm:col-span-2">
                  <Label>身分證字號 *</Label>
                  <Input
                    value={player.nationalId}
                    onChange={(e) => updatePlayer(index, "nationalId", e.target.value.toUpperCase())}
                    placeholder="例：A123456789"
                    maxLength={10}
                    className="mt-1"
                  />
                  {dup?.isSecondItem && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">此選手已報名「{dup.groupName}」</p>
                        <p>
                          本次為第2項費用：
                          {player.memberStatus === "NON_MEMBER"
                            ? <span className="font-semibold"> NT$ 450</span>
                            : <span className="font-semibold"> 免費（已含在第1項費用中）</span>
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>出生日期 *</Label>
                  <DateSelectPicker value={player.birthday} onChange={(v) => updatePlayer(index, "birthday", v)}
                    maxYear={new Date().getFullYear()} className="mt-1" />
                  {age !== null && <p className="text-xs text-gray-500 mt-1">目前年齡：{age} 歲</p>}
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
                  <p className="text-xs text-gray-400 mt-1">填寫後可自動關聯入會申請</p>
                </div>
                <div>
                  <Label>緊急聯絡人</Label>
                  <Input value={player.emergencyContact} onChange={(e) => updatePlayer(index, "emergencyContact", e.target.value)}
                    placeholder="緊急聯絡人姓名（選填）" className="mt-1" />
                </div>
                <div>
                  <Label>緊急聯絡電話</Label>
                  <Input value={player.emergencyPhone} onChange={(e) => updatePlayer(index, "emergencyPhone", e.target.value)}
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
                  {memberCheckFailed && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>此身分證目前非協會有效會員，請確認會籍狀態或改選其他身分</p>
                    </div>
                  )}
                  {dup?.isSecondItem && (
                    <p className="text-xs text-gray-400 mt-1">
                      ＊第2項費用已依上方規則調整，無需另行選擇
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="p-5 space-y-4">
          {players.every((p) => p.birthday) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span>選手年齡：</span>
                <span>{players.map((p) => getPlayerAge(p.birthday) ?? "?").join(" + ")} 歲</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>總年齡：</span>
                <span className={
                  players.reduce((s, p) => s + (getPlayerAge(p.birthday) ?? 0), 0) < group.minTotalAge
                    ? "text-red-600" : "text-green-600"
                }>
                  {players.reduce((s, p) => s + (getPlayerAge(p.birthday) ?? 0), 0)} 歲
                  （需 {group.minTotalAge}+）
                </span>
              </div>
            </div>
          )}

          {validation.length > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">費用明細</h3>
            {players.map((p, i) => {
              const dup = duplicates[i];
              const fee = getPlayerFee(p, i);
              return (
                <div key={i} className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5">
                    {p.name || `第${i + 1}位選手`}
                    <span className="text-gray-400">（{memberStatusLabel[p.memberStatus]}）</span>
                    {dup?.isSecondItem && (
                      <Badge variant="warning" className="text-xs">第2項</Badge>
                    )}
                  </span>
                  <span className={fee === 0 ? "text-green-600 font-medium" : ""}>
                    {fee === 0 ? "免費" : formatCurrency(fee)}
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>應繳總金額</span>
              <span className="text-blue-600">{formatCurrency(calculateTotalFee())}</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <ShieldAlert className="w-4 h-4 text-gray-600 shrink-0" />
              <span className="text-sm font-semibold text-gray-800">參賽健康與安全同意切結書</span>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(v) => setConsentChecked(!!v)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-sm text-gray-700 leading-snug">
                  我已詳閱、充分理解並同意「參賽健康與安全同意切結書」之所有內容，並保證上述聲明皆為屬實。
                  <span className="text-red-500 ml-1">*</span>
                </span>
              </label>
            </div>
          </div>

          {validation.length === 0 && consentChecked && (
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>資料驗證通過，可以儲存修改</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || validation.length > 0 || checkingDuplicates || checkingMembership || !consentChecked}
            className="w-full h-12 text-base"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
            {loading ? "儲存中..." : (checkingDuplicates || checkingMembership) ? "檢查中..." : "儲存修改並前往匯款"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
