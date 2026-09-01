# IndexedDB導入実装計画

## 背景・目的
- 日記アプリ(nikkiApp)にIndexedDBを導入し、オフラインでも日記データの挿入・閲覧・更新・削除ができる環境を作る。
- 現状、`app/page.tsx`はcreate-next-appの初期状態のままで、データ永続化の仕組みは未実装。既存ロジックとの衝突はない。

## 前提・現状確認
- Next.js 16.3.4 / React 19.2.8 / App Router構成。
- データ層・状態管理・型定義は未実装（ゼロから設計可能）。
- IndexedDBはブラウザAPIのため、Server Componentからは利用不可。`"use client"`境界を明確に設計する必要がある。

## ライブラリ選定
**[`idb`](https://www.npmjs.com/package/idb)** を採用する（ユーザー承認済み）。Promiseベースで書け、TypeScriptの型付けもしやすく、SOLID/DRY原則に沿って薄いデータアクセス層を作りやすい。

## データスキーマ設計
[仕様.md](./仕様.md) / [column.md](./column.md) に基づく。

DB名: `nikkiapp-db`、バージョン: `1`

### ObjectStore: `entries`（日記エントリ）
| フィールド | 型 | 説明 |
|---|---|---|
| id | string (UUID) | 主キー（`keyPath: "id"`） |
| title | string | タイトル |
| content | string | 本文 |
| createdAt | number (epoch ms) | 作成日時 |
| updatedAt | number (epoch ms) | 更新日時 |
| tags | string[] | タグ（例: 仕事, 生活。自由入力可、プリセットは`仕事`/`生活`） |
| mood | number (1-10) | 気分（1=悲しい/怒り 〜 10=ハッピー のグラデーション。UIでラベル・絵文字にマッピング） |

インデックス:
- `by-createdAt`（`createdAt`, 一覧の日付ソート・「その日のエントリ」取得用）

## 今回のスコープ外（仕様.mdより。別タスクで対応）
仕様.mdにはUI/UX全体像（Apple風モノクロデザイン、下部固定タブバー、上下スクロールで前後日へ移動、2本指スワイプで週/月/年切り替え等）が記載されているが、今回は「IndexedDB導入・CRUD処理まで」がスコープのため、以下は対象外とする。
- 高度なジェスチャー操作（スワイプでの期間切替、スクロールでの前後日移動）
- 期間切り替えタブ（週/月/年表示）
- タブ項目の可変構成

今回実装するUIは、上記の土台となる「当日の入力フォーム＋一覧表示＋編集・削除」が動作確認できる最小限のモノクロ・モバイルファーストUIとする。

## ディレクトリ構成（新規追加）
```
lib/
  db/
    schema.ts       # DiaryEntry型定義、DBスキーマ型
    client.ts        # openDB()の初期化・シングルトン管理
    entries.ts        # CRUD関数（create/getAll/getById/update/remove）
hooks/
  useDiaryEntries.ts  # React hook（一覧取得・CRUD呼び出しをラップ）
```
- データアクセス層（`lib/db`）とUI層（`hooks`, `app/`）を分離し、SOLID原則（単一責任・依存性逆転）を担保する。

## 実装ステップ
1. **依存関係追加**: `idb` パッケージをインストール（ユーザー承認後）。
2. **スキーマ・型定義**: `lib/db/schema.ts` に `DiaryEntry` 型とDBスキーマ型（`DBSchema`継承）を定義。
3. **DB初期化**: `lib/db/client.ts` に `getDB()` を実装。`openDB()` をブラウザ環境でのみ実行するようガード（`typeof window !== "undefined"`）し、シングルトンでPromiseをキャッシュ。
4. **CRUD実装**: `lib/db/entries.ts` に以下を実装。
   - `createEntry(input): Promise<DiaryEntry>`
   - `getAllEntries(): Promise<DiaryEntry[]>`（`by-createdAt`降順）
   - `getEntryById(id): Promise<DiaryEntry | undefined>`
   - `updateEntry(id, patch): Promise<DiaryEntry>`
   - `deleteEntry(id): Promise<void>`
5. **Reactフック**: `hooks/useDiaryEntries.ts` で一覧状態・ローディング・エラーを管理し、CRUD操作をコンポーネントに提供。
6. **UI組み込み**: `app/page.tsx` を日記一覧＋新規作成フォームに置き換え、CRUD操作の動作確認ができる最小UIを実装。`"use client"` を付与。
7. **動作確認**: ブラウザで一覧表示・作成・更新・削除・リロード後のデータ永続化・オフライン（DevTools Offlineモード）での動作を確認。

## 留意事項
- SSR/ハイドレーション時にIndexedDBへアクセスしないよう、初期化は`useEffect`内またはクライアント専用モジュールに限定する。
- エラーハンドリングは境界（DB接続失敗、トランザクション失敗）のみに留め、過剰な防御コードは避ける。
- 本計画は基本CRUDのスコープに限定。同期機能・競合解決・サーバー連携は対象外。

## 確定事項
- `idb` パッケージを使用する。
- `entries`のフィールド構成は[column.md](./column.md)の通り（タグ・気分を含む）で確定。

## 追加実装: 日付ナビゲーション（スクロールでの前日/翌日移動）
仕様.mdの「上下のスクロールで前日、後日へスムースに移動可能」「画面を開くと、その日の入力フォーマットを表示する」に対応する追加要望。

- 表示中の日付を`selectedDate`としてUI状態に保持し、エントリが1件も無い日でも空の入力フォームを表示する（＝日付は「その日のエントリが存在するか」に依存しない）。
- `createdAt`を「レコードが実際に作られた時刻」ではなく「日記が対象とする日付」として扱うよう`createEntry`の意味を変更する（過去の日付を選んで新規作成した場合、その日付のエントリとして保存されるため）。`updatedAt`は実際の保存操作時刻のまま。
- ナビゲーション手段: マウスホイール（縦方向、即座に切り替え）／タッチスワイプ（横方向。左スワイプで翌日、右スワイプで前日）と、前日・翌日ボタンの併用。フォーム要素（input/textarea）上の操作は日付切り替えとして扱わない。横スワイプは縦方向の移動量の方が大きい場合はページスクロールとみなして無視する。
- 横スワイプは指の位置にリアルタイム追従してメインコンテンツを`translateX`させ（[hooks/useDateNavigation.ts](../../hooks/useDateNavigation.ts)の`dragOffset`）、指を離した時に閾値を超えていれば画面外へスライドさせてから日付を確定、超えなければ0へスナップバックする。

## 追加実装: 一覧の本文の折りたたみ表示
本文が一定文字数を超える場合は`line-clamp-3`で省略表示し、「詳細を表示」ボタンで全文表示に切り替えられるようにする（[app/page.tsx](../../app/page.tsx)の`EntryListItem`）。
- 未来日には移動不可（今日が上限）。過去方向は無制限。
- DB層・スキーマの変更はなし。既存の`getAllEntries()`で取得した全件をクライアント側で日付フィルタする（データ量の少ない日記アプリの用途では十分、クエリ層を複雑化しない）。
