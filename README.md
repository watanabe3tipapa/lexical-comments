# Lexical Comments Editor

文章を選択してコメントを追加できるリッチテキストエディターです。Lexical を用いた注釈（コメント）機能を備え、コメントのスレッド返信や解決管理、エディターの書式設定やMarkdown出力などが利用できます。

ホームページ: https://lexical-comments.vercel.app

## 概要

このリポジトリは、テキスト選択によるコメント追加・スレッド返信・解決管理などのコメント機能を組み合わせたリッチテキストエディターの実装例です。エディター本体には Meta の Lexical を用い、フロントエンドは TypeScript と React ベースで構築されています。

## 主な機能

- エディター機能
  - 書式設定（太字、斜体、下線、取り消し線、コードなど）
  - 自動保存（localStorage への保存）
  - Markdown 形式での出力（ダウンロード）
- コメント機能
  - テキスト選択からコメントを追加
  - スレッド形式の返信
  - 解決/未解決ステータスの切替
  - コメント一覧のフィルター表示（すべて / 未解決 / 解決済み）
- 認証（README に記載されている内容）
  - GitHub OAuth によるログイン（オプション）
  - 名前のみのシンプルなログイン（オプション）

## 技術スタック（リポジトリ内の記載・実装依拠）

- フレームワーク: Next.js（package.json に next が含まれます）
- ライブラリ: React, TypeScript
- エディター: Lexical
- スタイリング: Tailwind CSS（設定ファイルが含まれています）
- データアクセス/ORM: Prisma（prisma フォルダと prisma 関連パッケージが存在します）
- ホスティング / デプロイ: Vercel（vercel.json が含まれます）

（既存 README 内で言及されている他の要素：Neon(PostgreSQL) や Hono などについての記載があります。詳細はリポジトリ内の設定ファイルや .env.example を参照してください。）

## 開発環境のセットアップ（確認できる事実に基づく最小手順）

前提
- Node.js（README では Node.js 18 以上が推奨されています）

インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd lexical-comments

# 依存関係をインストール
npm install
```

開発サーバーの起動

このリポジトリの package.json に定義されているスクリプトに従って、開発サーバーを起動できます（確認できるコマンド）:

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開くとアプリが確認できることが期待されます（Next.js のデフォルトポート）。

ビルド・実行

```bash
# ビルド（prisma generate を含むビルド手順が package.json に設定されています）
npm run build

# 本番用の起動
npm run start
```

環境変数

- リポジトリには .env.example（および既存 README）に環境変数の例が含まれています。GitHub OAuth を利用する場合は GITHUB_ID / GITHUB_SECRET の設定、デプロイ時にデータベースを利用する場合は DATABASE_URL 等の設定が必要になる想定です。詳細はリポジトリ内の .env.example や設定ファイルを参照してください。

※ README に示された環境変数例（VITE_API_URL 等）が残っていますが、本リポジトリの実装（package.json / Next.js 構成）に合わせて .env.example を参照のうえ必要な値を設定してください。

## プロジェクトの主なファイル・ディレクトリ

（リポジトリ内ファイルをもとに整理）

- app/ または src/ — アプリケーションのソース
- components/ — UI コンポーネント
- lib/ — API クライアントやユーティリティ
- prisma/ — Prisma スキーマ・マイグレーション関連
- public/ — 静的アセット
- package.json, next.config.js, vercel.json, tailwind.config.js, tsconfig.json

実際の構成はリポジトリ内のディレクトリを参照してください。

## API（README に記載のエンドポイント例）

既存 README には Next.js API もしくはサーバー側エンドポイントの一覧が記載されています。リポジトリ内の API 実装（/api/* 相当）を確認してください。例として README に記載されているエンドポイントの一部:

- GET /api/health
- POST /api/auth/login
- GET /api/auth/session
- POST /api/auth/logout
- GET /api/comments, POST /api/comments
- PATCH /api/comments/:id/resolve, DELETE /api/comments/:id
- POST /api/comments/:id/replies, DELETE /api/replies/:id

（詳細はソース中の API 実装をご確認ください。）

## デプロイ

vercel.json が含まれており、Vercel へのデプロイを想定した構成が用意されています。デプロイ時は環境変数（DATABASE_URL, APP_URL, GITHUB_ID, GITHUB_SECRET 等）を Vercel 側に設定してください（詳細はリポジトリ内の記載や .env.example を参照）。

## 使い方（ユーザー操作の概要）

- ログイン: GitHub OAuth または名前入力の簡易ログイン（README に記載）
- テキストを入力し、コメントしたい箇所を選択してコメントを追加
- コメントはスレッドで返信可能、解決状態の切替や削除（自分のコメントのみ）
- Save（localStorage 保存）や Markdown ダウンロードでコンテンツを保存可能

## 状態・更新

- 最終更新: 2026-07-04T14:46:35Z（リポジトリの更新日時に基づく）
- Archived: false

## ライセンス

README に記載されたとおり MIT ライセンスです。

---

参考: この README はリポジトリ内の既存 README と実装上の根拠（package.json、ルートファイル群など）を基に再構成しています。実行や設定の詳細はリポジトリ内の .env.example、設定ファイル、ソースコードを参照してください。
