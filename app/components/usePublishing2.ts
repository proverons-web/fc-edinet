"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = {
  state: "idle" | "dirty" | "saving" | "saved" | "error";
  message: string;
  savedAt?: string;
};

export function useEditorHistory<T>(value: T, apply: (value: T) => void, delay = 280) {
  const signature = stable(value);
  const valueRef = useRef(value);
  valueRef.current = value;
  const historyRef = useRef<T[]>([clone(value)]);
  const cursorRef = useRef(0);
  const skipSignatureRef = useRef<string | null>(signature);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (skipSignatureRef.current === signature) {
      skipSignatureRef.current = null;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const history = historyRef.current;
      const current = history[cursorRef.current];
      if (stable(current) === signature) return;
      const next = history.slice(0, cursorRef.current + 1);
      next.push(clone(valueRef.current));
      if (next.length > 60) next.shift();
      historyRef.current = next;
      cursorRef.current = next.length - 1;
      force((v) => v + 1);
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [signature, delay]);

  const undo = useCallback(() => {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    const snapshot = clone(historyRef.current[cursorRef.current]);
    skipSignatureRef.current = stable(snapshot);
    apply(snapshot);
    force((v) => v + 1);
  }, [apply]);

  const redo = useCallback(() => {
    if (cursorRef.current >= historyRef.current.length - 1) return;
    cursorRef.current += 1;
    const snapshot = clone(historyRef.current[cursorRef.current]);
    skipSignatureRef.current = stable(snapshot);
    apply(snapshot);
    force((v) => v + 1);
  }, [apply]);

  return {
    undo,
    redo,
    canUndo: cursorRef.current > 0,
    canRedo: cursorRef.current < historyRef.current.length - 1,
  };
}

export function useDraftAutosave<T>(value: T, save: (value: T) => Promise<{ ok: boolean; savedAt?: string; error?: string }>, delay = 1800) {
  const signature = stable(value);
  const valueRef = useRef(value);
  valueRef.current = value;
  const saveRef = useRef(save);
  saveRef.current = save;
  const initialSignatureRef = useRef(signature);
  const lastSavedSignatureRef = useRef(signature);
  const requestRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>({ state: "idle", message: "Автосохранение включено" });

  useEffect(() => {
    if (signature === initialSignatureRef.current || signature === lastSavedSignatureRef.current) return;
    setStatus({ state: "dirty", message: "Есть несохранённые изменения" });
    if (timerRef.current) clearTimeout(timerRef.current);
    const request = ++requestRef.current;
    timerRef.current = setTimeout(async () => {
      setStatus({ state: "saving", message: "Автосохранение…" });
      try {
        const result = await saveRef.current(valueRef.current);
        if (request !== requestRef.current) return;
        if (!result.ok) {
          setStatus({ state: "error", message: result.error || "Ошибка автосохранения" });
          return;
        }
        lastSavedSignatureRef.current = signature;
        setStatus({ state: "saved", message: result.savedAt ? `Сохранено ${formatTime(result.savedAt)}` : "Черновик сохранён", savedAt: result.savedAt });
      } catch (error) {
        if (request !== requestRef.current) return;
        setStatus({ state: "error", message: error instanceof Error ? error.message : "Ошибка автосохранения" });
      }
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [signature, delay]);

  return status;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
function stable(value: unknown) { try { return JSON.stringify(value); } catch { return String(value); } }
function formatTime(value: string) {
  try { return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)); } catch { return value; }
}
