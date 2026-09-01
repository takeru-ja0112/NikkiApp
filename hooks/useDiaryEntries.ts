"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEntry,
  deleteEntry,
  getAllEntries,
  updateEntry,
} from "@/lib/db/entries";
import type { DiaryEntry, DiaryEntryInput, DiaryEntryPatch } from "@/lib/db/schema";

export function useDiaryEntries() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const all = await getAllEntries();
      setEntries(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エントリの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAllEntries()
      .then((all) => {
        if (cancelled) return;
        setEntries(all);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "エントリの取得に失敗しました");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(
    async (input: DiaryEntryInput) => {
      await createEntry(input);
      await refresh();
    },
    [refresh]
  );

  const edit = useCallback(
    async (id: string, patch: DiaryEntryPatch) => {
      await updateEntry(id, patch);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteEntry(id);
      await refresh();
    },
    [refresh]
  );

  return { entries, isLoading, error, add, edit, remove };
}
