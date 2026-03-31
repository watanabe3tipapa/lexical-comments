# Lexical Comments Editor

文章を選択してコメントを追加できる、リッチテキストエディターです。

![Lexical Editor](https://img.shields.io/badge/Lexical-Meta's%20Editor-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF)

## 主な機能

### ✏️ エディター機能
- **Lexical Editor** - Meta社開発した高性能エディター
- **書式設定** - 太字、斜体，下線、取り消し線、コード
- **自動保存** - localStorageに内容を自動保存
- **Markdown出力** - 内容をMarkdown形式でダウンロード

### 💬 コメント機能
- **テキスト選択でコメント追加** - 任意のテキストを選択してコメント
- **スレッド返信** - コメントに対して返信可能
- **解決ステータス** - コメントを解決/未解決状態に切り替え
- **コメント一覧** - 全コメントをフィルターして表示

### 🔐 認証
- **GitHub OAuth** - GitHubアカウントでログイン可能
- **シンプルなログイン** - 名前でもログイン可能

## スクリーンショット

```
┌─────────────────────────────────────────────────┐
│  Lexical Comments                    [アバター] 名前 ログアウト │
├─────────────────────────────────────────────────┤
│  [B] [I] [U] [S] [</>] │ [Save] [Download] [Comments(3)] │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │     ここにテキストを入力...                │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Vite + React + TypeScript |
| エディター | Lexical (Meta社) |
| スタイリング | Tailwind CSS v4 |
| APIサーバー | Hono |
| データベース | Neon (PostgreSQL) |
| ORM | Prisma |
| 認証 | GitHub OAuth / シンプルログイン |
| ホスティング | Vercel |

## 始め方

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd lexical-comments

# 依存関係をインストール
npm install
```

### 環境変数の設定 (.env)

```env
# APIサーバーURL
VITE_API_URL=http://localhost:3001

# GitHub OAuth認証（オプション）
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

### GitHub OAuthの設定

1. https://github.com/settings/applications/new で新しいOAuth Appを作成
2. 以下の設定を入力：
   - **Application name**: Lexical Comments
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3001/api/auth/github/callback
3. `Client ID`と`Client Secret`をコピー
4. `.env`ファイルに設定

### 開発サーバーの起動

```bash
# APIサーバーとフロントエンドを同時に起動
npm run dev:all

# または個別に起動

# ターミナル1: APIサーバー (ポート3001)
npm run dev:server

# ターミナル2: フロントエンド (ポート3000)
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

### ビルド

```bash
npm run build
```

dist フォルダーに最適化されたファイルが生成されます。

## 使い方

### 1. ログイン
2つの方法でログインできます：
- **GitHubでログイン** - OAuth認証（プロフィール画像も表示）
- **名前でログイン** -  あなたの名前入力

### 2. 文章を入力
エディターに好きな文章を入力できます。

### 3. コメントを追加
コメントしたいテキストを選択して、ポップオーバーでコメントを入力します。

```
1. テキストを選択
2. コメントを入力
3. Ctrl+Enter または「追加」ボタンをクリック
```

### 4. コメントを管理
**Comments**ボタンをクリックすると：
- すべてのコメント一覧を表示
- フィルター：すべて / 未解決 / 解決済み
- 返信機能
- 解決/未解決の切り替え
- 削除（自分のコメントのみ）

### 5. 保存と出力
- **Save** - localStorageに保存
- **Download** - Markdownファイルとしてダウンロード

## プロジェクト構成

```
lexical-comments/
├── src/
│   ├── components/
│   │   └── LexicalEditorComponent.tsx  # エディター + コメントUI
│   ├── lib/
│   │   └── api.ts                    # APIクライアント + 認証
│   ├── server/
│   │   └── index.ts                  # Hono APIサーバー
│   ├── App.tsx                      # メインアプリ
│   └── main.tsx                     # エントリーポイント
├── .env                             # 環境変数
├── package.json
└── README.md
```

## APIエンドポイント

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | /api/health | サーバー状態確認 |
| GET | /api/auth/github | GitHub OAuth URL取得 |
| GET | /api/auth/github/callback | GitHub OAuthコールバック |
| POST | /api/auth/login | 名前でログイン |
| GET | /api/auth/session | 現在のセッション取得 |
| POST | /api/auth/logout | ログアウト |
| GET | /api/comments | コメント一覧取得 |
| POST | /api/comments | コメント作成 |
| PATCH | /api/comments/:id/resolve | コメント解決状態更新 |
| DELETE | /api/comments/:id | コメント削除 |
| POST | /api/comments/:id/replies | 返信作成 |
| DELETE | /api/replies/:id | 返信削除 |

## Vercelへのデプロイ

### 1. GitHubにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercelでインポート

1. https://vercel.com にアクセス
2. **New Project** をクリック
3. GitHubリポジトリを選択
4. **Environment Variables** を設定：

| キー | 値 |
|------|-----|
| `DATABASE_URL` | Neonの接続文字列 |
| `APP_URL` | VercelのデプロイURL（例: https://your-app.vercel.app） |
| `GITHUB_ID` | GitHub OAuth Client ID（オプション） |
| `GITHUB_SECRET` | GitHub OAuth Client Secret（オプション） |

### 3. デプロイ

**Deploy** ボタンをクリック。数分で完了します。

### 本番環境での環境変数

Vercelにデプロイする場合は、以下の環境変数を設定してください：
- `DATABASE_URL` - NeonのPostgreSQL接続文字列（必須）
- `APP_URL` - VercelのデプロイURL（例: https://lexical-comments.vercel.app）
- `GITHUB_ID` - GitHub OAuth Client ID（オプション）
- `GITHUB_SECRET` - GitHub OAuth Client Secret（オプション）

## カスタマイズ

### テーマの編集
`src/index.css` でCSS変数を変更してテーマを変更できます：

```css
:root {
  --accent: #aa3bff;        /* アクセントカラー */
  --bg: #ffffff;           /* 背景色 */
  --text: #6b6375;          /* テキスト色 */
}
```

### 書式の追加
`LexicalEditorComponent.tsx`の`SUPPORTED_FORMATS`配列に新しい書式を追加できます。


### 実装

このツールは、 .|main（https://watanabe3ti.com/）|. で使用しています。


## ライセンス

MIT
