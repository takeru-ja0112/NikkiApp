import type { DBSchema } from "idb";

export const PRESET_TAGS = ["仕事", "生活"] as const;

/** 1=悲しい/怒り 〜 10=ハッピー のグラデーション */
export type Mood =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  mood: Mood;
}

export type DiaryEntryInput = Pick<
  DiaryEntry,
  "title" | "content" | "tags" | "mood"
>;

export type DiaryEntryPatch = Partial<DiaryEntryInput>;

export interface NikkiDB extends DBSchema {
  entries: {
    key: string;
    value: DiaryEntry;
    indexes: { "by-createdAt": number };
  };
}
