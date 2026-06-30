"use client";
import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DDThh:mm"
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  includeTime?: boolean;
  disabled?: boolean;
  className?: string;
  /** Use browser-native date picker instead of select dropdowns. Recommended for birthdays. */
  native?: boolean;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parse(value: string) {
  const [datePart = "", timePart = ""] = value ? value.split("T") : [];
  const [y = "", m = "", d = ""] = datePart.split("-");
  const [h = "0", mi = "0"] = timePart.split(":");
  return {
    year: y ? parseInt(y) : 0,
    month: m ? parseInt(m) : 0,
    day: d ? parseInt(d) : 0,
    hour: h ? parseInt(h) : 0,
    minute: mi ? parseInt(mi) : 0,
  };
}

export default function DateSelectPicker({
  value,
  onChange,
  minYear,
  maxYear,
  includeTime = false,
  disabled,
  className,
  native = false,
}: Props) {
  const thisYear = new Date().getFullYear();
  const minY = minYear ?? thisYear - 120;
  const maxY = maxYear ?? thisYear;

  const initial = parse(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  // Track last value we emitted so we can distinguish external vs internal changes
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      const p = parse(value);
      setYear(p.year);
      setMonth(p.month);
      setDay(p.day);
      setHour(p.hour);
      setMinute(p.minute);
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emit = (y: number, m: number, d: number, h: number, mi: number) => {
    if (!y || !m || !d) return; // wait until all date parts are selected
    const maxDay = daysInMonth(y, m);
    const safeDay = Math.min(d, maxDay);
    const date = `${y}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    const full = includeTime
      ? `${date}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`
      : date;
    lastEmittedRef.current = full;
    onChange(full);
  };

  const maxDays = year && month ? daysInMonth(year, month) : 31;
  const years = Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  if (native) {
    const minDate = `${minY}-01-01`;
    const maxDate = `${maxY}-12-31`;
    const dateValue = value ? value.split("T")[0] : "";
    return (
      <input
        type="date"
        value={dateValue}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onChange(v);
        }}
        className={`flex h-9 w-full max-w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      />
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      <Select
        value={year ? String(year) : ""}
        onValueChange={(v) => {
          const y = parseInt(v);
          setYear(y);
          emit(y, month, day, hour, minute);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[90px] h-9"><SelectValue placeholder="年" /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={month ? String(month) : ""}
        onValueChange={(v) => {
          const m = parseInt(v);
          const safeDay = year && day ? Math.min(day, daysInMonth(year, m)) : day;
          setMonth(m);
          if (safeDay !== day) setDay(safeDay);
          emit(year, m, safeDay, hour, minute);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[86px] h-9"><SelectValue placeholder="月" /></SelectTrigger>
        <SelectContent>
          {months.map((m) => <SelectItem key={m} value={String(m)}>{m} 月</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={day ? String(day) : ""}
        onValueChange={(v) => {
          const d = parseInt(v);
          setDay(d);
          emit(year, month, d, hour, minute);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[86px] h-9"><SelectValue placeholder="日" /></SelectTrigger>
        <SelectContent>
          {days.map((d) => <SelectItem key={d} value={String(d)}>{d} 日</SelectItem>)}
        </SelectContent>
      </Select>

      {includeTime && (
        <>
          <Select
            value={String(hour)}
            onValueChange={(v) => {
              const h = parseInt(v);
              setHour(h);
              emit(year, month, day, h, minute);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[72px] h-9"><SelectValue placeholder="時" /></SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")} 時</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(minute)}
            onValueChange={(v) => {
              const mi = parseInt(v);
              setMinute(mi);
              emit(year, month, day, hour, mi);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[72px] h-9"><SelectValue placeholder="分" /></SelectTrigger>
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
