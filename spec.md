# i-PRO 全方位カメラ ダッシュボード プロトタイプ 仕様書

## 1. プロジェクト概要

i-PRO 全方位カメラ（WV-XAE300WUX）の AI 動体検知/AI 人数カウントアプリケーションから取得したデータを可視化する Next.js ダッシュボードのプロトタイプ。

### 技術スタック

- **フレームワーク**: Next.js (App Router)
- **UI**: shadcn/ui（初期化済み）、Tailwind CSS
- **チャートライブラリ**: recharts（shadcn/ui のチャートコンポーネント推奨）
- **デザインテイスト**: Vercel ライクなシックでクールな UI
- **対応デバイス**: PC / モバイル両対応（レスポンシブ）

---

## 2. データソース

### 2.1 カメラ構成

| カメラ名 | 用途 | IP（参考） |
|----------|------|-----------|
| アイランド側 | 店舗入口の一つ。ラインクロス人数カウント＋ヒートマップ | 172.16.10.105 |
| 食品側 | 店舗入口の一つ。ラインクロス人数カウント | 別カメラ |

### 2.2 データファイル配置

```
app/data/
├── island/                          # アイランド側カメラ
│   ├── linecross.cgi                # ラインクロスCGIレスポンス（3/17 1日分）
│   └── heatmap_mov.cgi              # ヒートマップ（通過）CGIレスポンス（3/17 1日分、JPEG含む）
└── food/
    ├── linecross.cgi                # 食品側ラインクロスCGIレスポンス（3/10〜15 5日分）
    └── (heatmap_mov.cgi)            # 今後追加可能
```

### 2.3 CGI レスポンスフォーマット

CGI レスポンスは multipart/form-data 形式で、`--myboundary` で区切られた複数パートから構成される。

#### ラインクロス人数カウント CSV

各パートの filename は `mov_obj_cnt_YYYYMMDDHHMM_YYYYMMDDHHMM.csv` の形式。

```
s_yyyymmdd,s_hhmm,e_yyyymmdd,e_hhmm,p_hhmm,timezone,summertime
s_x1,s_y1,e_x1,e_y1,count_in1,count_out1     ← ライン1
s_x2,s_y2,e_x2,e_y2,count_in2,count_out2     ← ライン2
...
s_x8,s_y8,e_x8,e_y8,count_in8,count_out8     ← ライン8
```

- 1行目: ヘッダ（開始日時UTC、終了日時UTC、保存間隔、タイムゾーン、サマータイム）
- 2〜9行目: ライン1〜8の始点・終点座標（800×800座標系）と In/Out カウント
- ライン未設定の場合は全て0
- タイムゾーンは `+09:00`（JST）

#### ヒートマップ（通過マップ）CSV

各パートは CSV と JPEG が交互に格納される。filename は以下の形式:
- CSV: `heatmap_mov_info_YYYYMMDDHHMM_YYYYMMDDHHMM.csv`
- JPEG: `index_YYYYMMDDHHMM_YYYYMMDDHHMM.jpg`（320×320px）

CSV フォーマット:
```
s_yyyymmdd,s_hhmm,e_yyyymmdd,e_hhmm,p_hhmm,timezone,summertime
info(1,1),info(2,1),...,info(64,1)
info(1,2),info(2,2),...,info(64,2)
...
info(1,64),info(2,64),...,info(64,64)
```

- 1行目: ヘッダ（同上）
- 2〜65行目: 64×64グリッドの通過カウント情報

### 2.4 カメラ別有効ライン

| カメラ | 有効ライン | 備考 |
|--------|-----------|------|
| アイランド側 | ライン1, ライン3 | ライン3はトイレ入口。**客数カウントにはライン1のみ使用** |
| 食品側 | ライン1のみ | ライン2〜8は全て0（未設定） |

### 2.5 採用データ期間

| カメラ | 採用日（JST） | 用途 |
|--------|-------------|------|
| アイランド側 | 3/17（単日） | トップページの来店客数、ヒートマップ |
| 食品側 | 3/10（単日） | トップページの来店客数 |
| 食品側 | 3/10〜3/15（5日分） | 期間集計ページ |

---

## 3. ビルド前データ処理

### 3.1 パーススクリプト

`app/data/` 内の `.cgi` ファイルをビルド前にパースし、JSON と画像ファイルに展開する Node.js スクリプトを用意する。

```
scripts/parse-cgi.js   (or .ts)
```

実行タイミング: `package.json` の `prebuild` または `predev` スクリプトとして登録。

```json
{
  "scripts": {
    "parse-data": "node scripts/parse-cgi.js",
    "predev": "npm run parse-data",
    "prebuild": "npm run parse-data"
  }
}
```

### 3.2 展開先構造

```
app/data/
├── parsed/
│   ├── island/
│   │   ├── linecross/
│   │   │   └── 2026-03-17.json        # 時間帯別ライン別 in/out 配列
│   │   └── heatmap/
│   │       ├── 2026-03-17_cumulative.json  # 1日累計64×64グリッド
│   │       ├── 2026-03-17_hourly.json      # 時間帯別64×64グリッド
│   │       └── thumbnails/
│   │           ├── 09.jpg                   # 時間帯別サムネイル（JST時表記）
│   │           ├── 10.jpg
│   │           └── ...
│   └── food/
│       └── linecross/
│           ├── 2026-03-10.json
│           ├── 2026-03-11.json
│           ├── 2026-03-12.json
│           ├── 2026-03-13.json
│           ├── 2026-03-14.json
│           └── 2026-03-15.json
```

### 3.3 パース済み JSON フォーマット

#### ラインクロス JSON（例: `2026-03-17.json`）

```json
{
  "date": "2026-03-17",
  "timezone": "+09:00",
  "lines": {
    "line1": {
      "coords": { "sx": 183, "sy": 189, "ex": 136, "ey": 189 },
      "hourly": [
        { "utcHour": 0, "jstHour": 9, "countIn": 174, "countOut": 214 },
        { "utcHour": 1, "jstHour": 10, "countIn": 190, "countOut": 219 },
        ...
      ],
      "totalIn": 2319,
      "totalOut": 2648
    },
    "line3": {
      "coords": { "sx": 88, "sy": 134, "ex": 98, "ey": 98 },
      "hourly": [...],
      "totalIn": 1166,
      "totalOut": 1172
    }
  }
}
```

#### ヒートマップ JSON（例: `2026-03-17_cumulative.json`）

```json
{
  "date": "2026-03-17",
  "maxValue": 97,
  "grid": [[0,0,...], [0,0,...], ...],   // 64×64 の2次元配列
  "activeRegion": { "minRow": 3, "maxRow": 57, "minCol": 13, "maxCol": 54 }
}
```

### 3.4 展開 vs 非展開のパフォーマンス

プロトタイプでは**事前展開を推奨**する。理由:

- CGI ファイルはバイナリ（JPEG）とテキスト（CSV）が混在した multipart 形式のため、毎回パースするとオーバーヘッドが大きい
- JPEG は `public/` に配置して `<img>` で直接参照する方が効率的
- JSON に展開済みであれば API の `fs.readFileSync` で即座に読み込める
- ビルド前の1回だけのパースで十分

---

## 4. ページ構成

### 4.1 トップページ (`/`)

#### 4.1.1 来店客数サマリー（カード表示）

| 項目 | 値の算出方法 |
|------|-------------|
| 1日の来店客数（合計） | 食品側ライン1 total_in + アイランド側ライン1 total_in |
| 食品側入口 来店客数 | 食品側ライン1 total_in |
| アイランド側入口 来店客数 | アイランド側ライン1 total_in |

メトリクスカードとして上部に横並び（モバイルは縦積み）で表示。

#### 4.1.2 店内客数 推移グラフ（折れ線チャート）

- X軸: 時間帯（JST、0:00〜23:00）
- Y軸: 店内推定客数
- **算出方法**: 各時間帯の `(累計 total_in - 累計 total_out)` を食品側+アイランド側で合算
  - つまり、ある時間 t における店内客数 = Σ(0〜t) の全入口合計 in - Σ(0〜t) の全入口合計 out
- recharts の `LineChart` または `AreaChart` を使用
- ツールチップでホバー時に詳細表示

#### 4.1.3 ヒートマップ表示（アイランド側）

- サムネイル画像（JPEG）を背景に、64×64 の通過ヒートマップを Canvas で重ね合わせて表示
- **色の方向を反転**: 通行数が**少ない**セルほど opacity を高くする（通行が少ない＝滞留や死角の可能性を強調）
- 通行数が多いセルは薄く、0のセルは非表示
- Opacity 調整スライダーを付ける
- カラースケールの凡例を表示
- サムネイルは1日のうち代表的な1枚（例: 最も人流が多い16:00 JST のもの）を使用

### 4.2 期間集計ページ (`/spancollection`)

#### 4.2.1 日別集計バーチャート

- 食品側カメラ、3/10〜3/15 の5日分（3/15は20時間分のデータ）
- X軸: 日付（曜日表示付き）
- Y軸: 人数
- In / Out を色分けした棒グラフ
- 各日の合計をバー上部またはカードに表示

#### 4.2.2 時間帯別詳細

- 日別集計のバーをクリック、またはボタンで日付を選択
- 選択した日の時間帯別 In/Out を折れ線グラフまたはバーチャートで表示
- ピーク時間帯をハイライト表示
- メトリクスカード: その日の合計 In、合計 Out、ピーク時間帯（JST）、ピーク時間帯の In 数

---

## 5. API 設計

すべてのデータ取得は Next.js Route Handlers (`app/api/*/route.ts`) 経由で行う。フロントエンドから `app/data/` を直接参照しない。

### 5.1 エンドポイント一覧

#### `GET /api/summary`

トップページ用のサマリーデータを返す。

**レスポンス例:**

```json
{
  "date": {
    "island": "2026-03-17",
    "food": "2026-03-10"
  },
  "totalVisitors": 5667,
  "entrances": [
    {
      "name": "食品側",
      "camera": "food",
      "line": "line1",
      "totalIn": 5686,
      "totalOut": 5770
    },
    {
      "name": "アイランド側",
      "camera": "island",
      "line": "line1",
      "totalIn": 2319,
      "totalOut": 2648
    }
  ]
}
```

※ totalVisitors = 食品側 line1 totalIn + アイランド側 line1 totalIn

#### `GET /api/occupancy`

時間帯別の店内客数推移を返す。

**レスポンス例:**

```json
{
  "hours": [
    { "jstHour": 0, "label": "0:00", "inFlow": 0, "outFlow": 0, "occupancy": 0 },
    ...
    { "jstHour": 9, "label": "9:00", "inFlow": 522, "outFlow": 437, "occupancy": 85 },
    { "jstHour": 10, "label": "10:00", "inFlow": 694, "outFlow": 624, "occupancy": 155 },
    ...
  ]
}
```

- `inFlow`: その時間の全入口合計 In
- `outFlow`: その時間の全入口合計 Out
- `occupancy`: 0時からの累計 (totalIn - totalOut)

#### `GET /api/heatmap`

ヒートマップデータを返す。

**レスポンス例:**

```json
{
  "date": "2026-03-17",
  "camera": "island",
  "maxValue": 97,
  "grid": [[0,0,...], ...],
  "thumbnailPath": "/data/heatmap/thumbnail.jpg"
}
```

※ サムネイル JPEG は `public/data/heatmap/` に配置し、パスのみ返す。

#### `GET /api/span?camera=food`

期間集計ページ用。日別サマリーの一覧を返す。

**レスポンス例:**

```json
{
  "camera": "food",
  "line": "line1",
  "days": [
    {
      "date": "2026-03-10",
      "dayOfWeek": "火",
      "totalIn": 5686,
      "totalOut": 5770,
      "peakHour": { "jstHour": 12, "countIn": 566 }
    },
    ...
  ]
}
```

#### `GET /api/span/[date]?camera=food`

特定日の時間帯別データを返す。

**レスポンス例:**

```json
{
  "camera": "food",
  "date": "2026-03-10",
  "dayOfWeek": "火",
  "totalIn": 5686,
  "totalOut": 5770,
  "peakHour": { "jstHour": 12, "label": "12:00", "countIn": 566 },
  "hourly": [
    { "jstHour": 0, "label": "0:00", "countIn": 0, "countOut": 0 },
    ...
    { "jstHour": 9, "label": "9:00", "countIn": 348, "countOut": 223 },
    ...
  ]
}
```

### 5.2 API 実装方針

- `app/data/parsed/` 配下の JSON を `fs.readFileSync` で読み込む
- ORM は不要（ファイルベース）
- 共通のパースユーティリティを `lib/data.ts` に切り出す
- エラーハンドリング: ファイルが見つからない場合は 404 を返す

---

## 6. パーススクリプト仕様 (`scripts/parse-cgi.js`)

### 6.1 処理フロー

1. `app/data/` 配下の `.cgi` ファイルを列挙
2. 各ファイルを `--myboundary` で分割
3. 各パートの `Content-Disposition` から filename を抽出
4. CSV パート: テキストとして読み取り、ヘッダ行とデータ行をパース
5. JPEG パート: バイナリの JPEG マーカー（`FFD8`〜`FFD9`）を検出して抽出・保存
6. パース結果を JSON として `app/data/parsed/` に書き出し

### 6.2 CGI バイナリのパース注意点

- CGI レスポンスにはテキスト（CSV）とバイナリ（JPEG）が混在しているため、ファイル全体をバイナリ（Buffer）として読み込む
- boundary の分割もバイナリレベルで行う
- ヘッダ部分のみ `toString('utf-8')` でテキスト化する
- JPEG の本体はバイナリのまま `fs.writeFileSync` で保存する
- 改行コードは `\r\n`（CRLF）

### 6.3 UTC → JST 変換

- CSV のタイムスタンプはすべて UTC
- JST = UTC + 9時間
- 日付をまたぐ場合の処理に注意（UTC 15:00 = JST 翌日 0:00）
- 日別集計は JST ベースで行う

### 6.4 サムネイル配置

ヒートマップの JPEG サムネイルは `public/data/heatmap/` に配置し、Next.js の静的ファイル配信で参照する。

---

## 7. UI/デザインガイドライン

### 7.1 全体方針

- Vercel ダッシュボードのようなモノトーン基調
- shadcn/ui の Card、Tabs、Button コンポーネントを活用
- ダークモード非対応（ライトモードのみで可）
- フォント: システムフォント（`font-sans`）

### 7.2 レイアウト

- ヘッダー: サイト名「i-PRO Analytics」+ ナビゲーション（トップ / 期間集計）
- メインコンテンツ: `max-w-7xl mx-auto` で中央寄せ
- モバイル: シングルカラム、カードは縦積み
- PC: グリッドレイアウト、メトリクスカードは横並び

### 7.3 チャート

- recharts を使用（shadcn/ui の chart コンポーネント推奨）
- ツールチップ、グリッド線、軸ラベルを適切に設定
- 色使い: 青系（In）/ グレーまたはオレンジ系（Out）で統一

### 7.4 ヒートマップ

- Canvas 要素で 64×64 グリッドを描画
- サムネイル画像を `drawImage` で背景に描画
- 各セルの値に応じて Inferno カラーマップで色付け
- **opacity の反転**: `opacity = 1 - (value / maxValue)` とし、通行が少ないセルほど目立つようにする（値0のセルは描画しない）
- スライダーで全体の opacity ベースを調整可能にする

---

## 8. ファイル構成（想定）

```
├── app/
│   ├── api/
│   │   ├── summary/
│   │   │   └── route.ts
│   │   ├── occupancy/
│   │   │   └── route.ts
│   │   ├── heatmap/
│   │   │   └── route.ts
│   │   └── span/
│   │       ├── route.ts              # GET /api/span?camera=food
│   │       └── [date]/
│   │           └── route.ts          # GET /api/span/2026-03-10?camera=food
│   ├── data/
│   │   ├── island/
│   │   │   ├── linecross.cgi
│   │   │   └── heatmap_mov.cgi
│   │   ├── food/
│   │   │   └── linecross.cgi
│   │   └── parsed/                   # パーススクリプトが生成
│   │       ├── island/
│   │       └── food/
│   ├── page.tsx                      # トップページ
│   ├── spancollection/
│   │   └── page.tsx                  # 期間集計ページ
│   └── layout.tsx                    # 共通レイアウト（ヘッダー、ナビ）
├── components/
│   ├── metrics-card.tsx
│   ├── occupancy-chart.tsx
│   ├── heatmap-canvas.tsx
│   ├── daily-bar-chart.tsx
│   ├── hourly-detail-chart.tsx
│   └── ui/                           # shadcn/ui コンポーネント
├── lib/
│   ├── data.ts                       # データ読み込みユーティリティ
│   └── utils.ts                      # 共通ユーティリティ
├── public/
│   └── data/
│       └── heatmap/
│           └── thumbnail.jpg         # ヒートマップ用サムネイル
├── scripts/
│   └── parse-cgi.ts                  # CGIパーススクリプト
└── package.json
```

---

## 9. 実装上の注意事項

1. **JST 変換の一貫性**: すべての時刻表示は JST で統一。UTC のままフロントに渡さない。
2. **ライン選択**: アイランド側はライン1を客数用、ライン3をトイレ用として区別。客数合算にはライン1のみ使用。
3. **データ欠損への対応**: 3/15 のデータは20時間分（UTC 0:00〜19:00）のみ。グラフ上で欠損時間帯は空白またはデータなし表示。
4. **ヒートマップの opacity 反転**: 通常のヒートマップとは逆に、通行が少ないセルほど強調する。これにより「人が通らない場所」が視覚的に浮かび上がる。
5. **`app/data/` のセキュリティ**: フロントエンドから直接アクセスされないよう、必ず API Route 経由でデータを返す。`app/data/` は `public/` に配置しない。
6. **サムネイル JPEG のみ `public/` に配置**: ヒートマップ重ね合わせ用のサムネイルは静的ファイルとして `public/data/heatmap/` に配置する。