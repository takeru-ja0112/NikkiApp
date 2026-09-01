"use client";

import { useMemo, useState } from "react";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import {
  DATE_NAV_SNAP_DURATION_MS,
  useDateNavigation,
} from "@/hooks/useDateNavigation";
import { isSameDay } from "@/lib/date";
import { PRESET_TAGS, type DiaryEntry, type Mood } from "@/lib/db/schema";

const CONTENT_PREVIEW_THRESHOLD = 80;

const MOOD_EMOJI: Record<Mood, string> = {
  1: "😡",
  2: "😢",
  3: "😞",
  4: "😕",
  5: "😐",
  6: "🙂",
  7: "😊",
  8: "😄",
  9: "😁",
  10: "🥰",
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type EntryFieldsValue = {
  title: string;
  content: string;
  tags: string[];
  mood: Mood;
};

const EMPTY_ENTRY_FIELDS: EntryFieldsValue = {
  title: "",
  content: "",
  tags: [],
  mood: 5,
};

function EntryFields({
  value,
  onChange,
}: {
  value: EntryFieldsValue;
  onChange: (patch: Partial<EntryFieldsValue>) => void;
}) {
  const toggleTag = (tag: string) => {
    onChange({
      tags: value.tags.includes(tag)
        ? value.tags.filter((t) => t !== tag)
        : [...value.tags, tag],
    });
  };

  return (
    <>
      <input
        value={value.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="タイトル"
        className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-base font-medium outline-none focus:border-black/40 dark:border-white/10 dark:focus:border-white/40"
      />
      <textarea
        value={value.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="今日はどんな一日でしたか？"
        rows={4}
        className="resize-none rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/10 dark:focus:border-white/40"
      />

      <div className="flex flex-wrap gap-2">
        {PRESET_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              value.tags.includes(tag)
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/20 text-black/60 dark:border-white/20 dark:text-white/60"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>
          {MOOD_EMOJI[value.mood]}
        </span>
        <input
          type="range"
          min={1}
          max={10}
          value={value.mood}
          onChange={(e) => onChange({ mood: Number(e.target.value) as Mood })}
          className="flex-1 accent-black dark:accent-white"
        />
        <span className="w-6 text-right text-xs text-black/50 dark:text-white/50">
          {value.mood}
        </span>
      </div>
    </>
  );
}

function EntryForm({
  onSubmit,
}: {
  onSubmit: (input: EntryFieldsValue) => Promise<void>;
}) {
  const [value, setValue] = useState<EntryFieldsValue>(EMPTY_ENTRY_FIELDS);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.title.trim() || !value.content.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit({
        ...value,
        title: value.title.trim(),
        content: value.content.trim(),
      });
      setValue(EMPTY_ENTRY_FIELDS);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
    >
      <EntryFields
        value={value}
        onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
      />
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-black py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        保存する
      </button>
    </form>
  );
}

function EntryListItem({
  entry,
  onSave,
  onDelete,
}: {
  entry: DiaryEntry;
  onSave: (patch: EntryFieldsValue) => Promise<void>;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState<EntryFieldsValue>({
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    mood: entry.mood,
  });
  const [isSaving, setIsSaving] = useState(false);
  const isLong = entry.content.length > CONTENT_PREVIEW_THRESHOLD;

  const startEditing = () => {
    setDraft({
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      mood: entry.mood,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        content: draft.content.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <li className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <EntryFields
          value={draft}
          onChange={(patch) => setDraft((v) => ({ ...v, ...patch }))}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-full bg-black py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            保存する
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full border border-black/20 px-4 py-2 text-sm text-black/60 dark:border-white/20 dark:text-white/60"
          >
            キャンセル
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{entry.title}</p>
          <p className="text-xs text-black/40 dark:text-white/40">
            {dateTimeFormatter.format(entry.createdAt)}
          </p>
        </div>
        <span className="text-xl" aria-hidden>
          {MOOD_EMOJI[entry.mood]}
        </span>
      </div>
      <p
        className={`whitespace-pre-wrap text-sm text-black/70 dark:text-white/70 ${
          isExpanded ? "" : "line-clamp-3"
        }`}
      >
        {entry.content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="self-start text-xs font-medium text-black/50 underline-offset-2 hover:underline dark:text-white/50"
        >
          {isExpanded ? "閉じる" : "詳細を表示"}
        </button>
      )}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={startEditing}
          className="text-xs font-medium text-black/60 underline-offset-2 hover:underline dark:text-white/60"
        >
          編集
        </button>
        <button
          onClick={onDelete}
          className="text-xs font-medium text-red-600/80 underline-offset-2 hover:underline dark:text-red-400/80"
        >
          削除
        </button>
      </div>
    </li>
  );
}

export default function Home() {
  const { entries, isLoading, error, add, edit, remove } = useDiaryEntries();
  const {
    selectedDate,
    isToday,
    goToPrevDay,
    goToNextDay,
    dragOffset,
    isSnapping,
  } = useDateNavigation();

  const dayEntries = useMemo(
    () => entries.filter((entry) => isSameDay(entry.createdAt, selectedDate)),
    [entries, selectedDate]
  );

  return (
    <div className="flex min-h-full flex-col overflow-x-hidden bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-zinc-50/80 px-2 py-3 backdrop-blur dark:border-white/10 dark:bg-black/80">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-2">
          <button
            onClick={goToPrevDay}
            aria-label="前日"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-black/60 active:bg-black/5 dark:text-white/60 dark:active:bg-white/10"
          >
            ‹
          </button>
          <h1 className="text-lg font-semibold">
            {dateFormatter.format(selectedDate)}
          </h1>
          <button
            onClick={goToNextDay}
            disabled={isToday}
            aria-label="翌日"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-black/60 disabled:opacity-30 active:bg-black/5 dark:text-white/60 dark:active:bg-white/10"
          >
            ›
          </button>
        </div>
      </header>

      <main
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isSnapping
            ? `transform ${DATE_NAV_SNAP_DURATION_MS}ms ease-out`
            : "none",
        }}
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4 pb-24"
      >
        <EntryForm
          key={`new-${selectedDate.getTime()}`}
          onSubmit={(input) => add(input, selectedDate)}
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            読み込み中...
          </p>
        ) : dayEntries.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            この日の日記はまだありません。今日の出来事を記録してみましょう。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dayEntries.map((entry) => (
              <EntryListItem
                key={entry.id}
                entry={entry}
                onSave={(patch) => edit(entry.id, patch)}
                onDelete={() => remove(entry.id)}
              />
            ))}
          </ul>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-lg justify-around py-2">
          <span className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium text-black dark:text-white">
            <span aria-hidden>📔</span>
            日記
          </span>
        </div>
      </nav>
    </div>
  );
}
