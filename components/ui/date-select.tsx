"use client";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  className?: string;
}

function toDisplay(iso: string): string {
  return iso ? iso.slice(0, 10).replace(/-/g, "") : "";
}

function toISO(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function isValidDate(raw: string, minYear?: number, maxYear?: number): boolean {
  if (!/^\d{8}$/.test(raw)) return false;
  const y = parseInt(raw.slice(0, 4));
  const m = parseInt(raw.slice(4, 6));
  const d = parseInt(raw.slice(6, 8));
  if (minYear !== undefined && y < minYear) return false;
  if (maxYear !== undefined && y > maxYear) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export default function DateSelectPicker({ value, onChange, minYear, maxYear, disabled, className }: Props) {
  const [raw, setRaw] = useState(() => toDisplay(value));
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setRaw(toDisplay(value));
      lastEmittedRef.current = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 8);
    setRaw(v);
    if (isValidDate(v, minYear, maxYear)) {
      const iso = toISO(v);
      lastEmittedRef.current = iso;
      onChange(iso);
    } else {
      lastEmittedRef.current = "";
      onChange("");
    }
  };

  const hasError = raw.length === 8 && !isValidDate(raw, minYear, maxYear);

  return (
    <Input
      value={raw}
      onChange={handleChange}
      placeholder="20260708"
      maxLength={8}
      inputMode="numeric"
      disabled={disabled}
      className={`${hasError ? "border-red-400 focus-visible:ring-red-400" : ""} ${className ?? ""}`}
    />
  );
}
