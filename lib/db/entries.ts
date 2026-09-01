import { getDB } from "./client";
import type { DiaryEntry, DiaryEntryInput, DiaryEntryPatch } from "./schema";

export async function createEntry(
  input: DiaryEntryInput,
  targetDate: Date = new Date()
): Promise<DiaryEntry> {
  const db = await getDB();
  const now = new Date();
  const createdAt = new Date(targetDate);
  createdAt.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    createdAt: createdAt.getTime(),
    updatedAt: now.getTime(),
    ...input,
  };
  await db.add("entries", entry);
  return entry;
}

export async function getAllEntries(): Promise<DiaryEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("entries", "by-createdAt");
  return entries.reverse();
}

export async function getEntryById(
  id: string
): Promise<DiaryEntry | undefined> {
  const db = await getDB();
  return db.get("entries", id);
}

export async function updateEntry(
  id: string,
  patch: DiaryEntryPatch
): Promise<DiaryEntry> {
  const db = await getDB();
  const existing = await db.get("entries", id);
  if (!existing) {
    throw new Error(`entry not found: ${id}`);
  }
  const updated: DiaryEntry = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await db.put("entries", updated);
  return updated;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("entries", id);
}
