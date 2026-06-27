"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DDThh:mm"
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  includeTime?: boolean;
  disabled?: boolean;
  className?: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function DateSelectPicker({
  value,
  onChange,
  minYear,
  maxYear,
  includeTime = false,
  disabled,
  className,
}: Props) {
  const thisYear = new Date().getFullYear();
  const min = minYear ?? thisYear - 120;
  const max = maxYear ?? thisYear;

  const [datePart = "", timePart = "00:00"] = value ? value.split("T") : [];
  const [yearStr = "", monthStr = "", dayStr = ""] = datePart.split("-");
  const [hourStr = "0", minuteStr = "0"] = timePart.split(":");

  const year = yearStr ? parseInt(yearStr) : 0;
  const month = monthStr ? parseInt(monthStr) : 0;
  const day = dayStr ? parseInt(dayStr) : 0;
  const hour = hourStr ? parseInt(hourStr) : 0;
  const minute = minuteStr ? parseInt(minuteStr) : 0;

  const emit = (y: number, m: number, d: number, h: number, mi: number) => {
    if (!y || !m || !d) return;
    const maxDay = daysInMonth(y, m);
    const safeDay = Math.min(d, maxDay);
    const date = `${y}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    if (includeTime) {
      onChange(`${date}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
    } else {
      onChange(date);
    }
  };

  const maxDays = year && month ? daysInMonth(year, month) : 31;
  const years = Array.from({ length: max - min + 1 }, (_, i) => max - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      <Select
        value={year ? String(year) : ""}
        onValueChange={(v) => emit(parseInt(v), month, day, hour, minute)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[90px] h-9">
          <SelectValue placeholder="年" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={month ? String(month) : ""}
        onValueChange={(v) => emit(year, parseInt(v), day, hour, minute)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[72px] h-9">
          <SelectValue placeholder="月" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={String(m)}>{m} 月</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={day ? String(day) : ""}
        onValueChange={(v) => emit(year, month, parseInt(v), hour, minute)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[72px] h-9">
          <SelectValue placeholder="日" />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={String(d)}>{d} 日</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {includeTime && (
        <>
          <Select
            value={String(hour)}
            onValueChange={(v) => emit(year, month, day, parseInt(v), minute)}
            disabled={disabled}
          >
            <SelectTrigger className="w-[72px] h-9">
              <SelectValue placeholder="時" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")} 時</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(minute)}
            onValueChange={(v) => emit(year, month, day, hour, parseInt(v))}
            disabled={disabled}
          >
            <SelectTrigger className="w-[72px] h-9">
              <SelectValue placeholder="分" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")} 分</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
