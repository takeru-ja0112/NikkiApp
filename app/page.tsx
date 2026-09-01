"use client";

import { useState } from "react";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import { PRESET_TAGS, type DiaryEntry, type Mood } from "@/lib/db/schema";

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

function EntryForm({
  editingEntry,
  onSubmit,
  onCancelEdit,
}: {
  editingEntry: DiaryEntry | null;
  onSubmit: (input: {
    title: string;
    content: string;
    tags: string[];
    mood: Mood;
  }) => Promise<void>;
  onCancelEdit: () => void;
}) {
  const [title, setTitle] = useState(editingEntry?.title ?? "");
  const [content, setContent] = useState(editingEntry?.content ?? "");
  const [tags, setTags] = useState<string[]>(editingEntry?.tags ?? []);
  const [mood, setMood] = useState<Mood>(editingEntry?.mood ?? 5);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const reset = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setMood(5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), tags, mood });
      reset();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
        className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-base font-medium outline-none focus:border-black/40 dark:border-white/10 dark:focus:border-white/40"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
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
              tags.includes(tag)
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
          {MOOD_EMOJI[mood]}
        </span>
        <input
          type="range"
          min={1}
          max={10}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value) as Mood)}
          className="flex-1 accent-black dark:accent-white"
        />
        <span className="w-6 text-right text-xs text-black/50 dark:text-white/50">
          {mood}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-full bg-black py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {editingEntry ? "更新する" : "保存する"}
        </button>
        {editingEntry && (
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              reset();
            }}
            className="rounded-full border border-black/20 px-4 py-2 text-sm text-black/60 dark:border-white/20 dark:text-white/60"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

export default function Home() {
  const { entries, isLoading, error, add, edit, remove } = useDiaryEntries();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingEntry = entries.find((e) => e.id === editingId) ?? null;

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-zinc-50/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-black/80">
        <h1 className="text-lg font-semibold">
          {dateFormatter.format(new Date())}
        </h1>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4 pb-24">
        <EntryForm
          editingEntry={editingEntry}
          onCancelEdit={() => setEditingId(null)}
          onSubmit={async (input) => {
            if (editingEntry) {
              await edit(editingEntry.id, input);
              setEditingId(null);
            } else {
              await add(input);
            }
          }}
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            読み込み中...
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            まだ日記がありません。今日の出来事を記録してみましょう。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
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
                <p className="whitespace-pre-wrap text-sm text-black/70 dark:text-white/70">
                  {entry.content}
                </p>
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
                    onClick={() => setEditingId(entry.id)}
                    className="text-xs font-medium text-black/60 underline-offset-2 hover:underline dark:text-white/60"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => remove(entry.id)}
                    className="text-xs font-medium text-red-600/80 underline-offset-2 hover:underline dark:text-red-400/80"
                  >
                    削除
                  </button>
                </div>
              </li>
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
