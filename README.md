# Lexical Comments Editor

文章を選択してコメントを追加できる、リッチテキストエディターです。

![Lexical Editor](https://img.shields.io/badge/Lexical-Meta's%20Editor-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

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
| フレームワーク | Next.js 14 (App Router) |
| エディター | Lexical (Meta社) |
| スタイリング | Tailwind CSS v3 |
| API | Next.js API Routes |
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

# データベースマイグレーション（初回のみ）
npx prisma migrate dev
```

### 環境変数の設定 (.env)

```env
# データベース接続文字列（Neonなど）
DATABASE_URL=postgresql://user:password@host:5432/database

# アプリケーションURL（本番環境）
APP_URL=http://localhost:3000

# GitHub OAuth認証（オプション）
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

### GitHub OAuthの設定

1. https://github.com/settings/applications/new で新しいOAuth Appを作成
2. 以下の設定を入力：
   - **Application name**: Lexical Comments
   - **Homepage URL**: あなたのURL
   - **Authorization callback URL**: `{APP_URL}/api/auth/github-callback`
3. `Client ID`と`Client Secret`をコピー
4. `.env`ファイルに設定

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

### ビルド

```bash
npm run build
```

`.next` フォルダーに最適化されたファイルが生成されます。

## 使い方

### 1. ログイン
2つの方法でログインできます：
- **GitHubでログイン** - OAuth認証（プロフィール画像も表示）
- **名前でログイン** - 名前入力のみ

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
├── app/
│   ├── api/                      # API Routes
│   │   ├── _utils/              # prisma, auth utilities
│   │   ├── auth/                # GitHub OAuth, session, logout
│   │   ├── comments/            # Comments CRUD
│   │   ├── replies/              # Replies
│   │   └── login/               # Simple login
│   ├── page.tsx                 # Main page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   └── LexicalEditorComponent.tsx  # Editor + Comment UI
├── lib/
│   └── api.ts                   # Client-side API
├── prisma/
│   └── schema.prisma            # Database schema
└── README.md
```

## APIエンドポイント

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | /api/login | 名前でログイン |
| GET | /api/auth/github | GitHub OAuth URL取得 |
| GET | /api/auth/github-callback | GitHub OAuthコールバック |
| GET | /api/auth/session | 現在のセッション取得 |
| POST | /api/auth/logout | ログアウト |
| GET | /api/comments | コメント一覧取得 |
| POST | /api/comments | コメント作成 |
| DELETE | /api/comments/[id] | コメント削除 |
| PATCH | /api/comments/[id]/resolve | コメント解決状態更新 |
| POST | /api/comments/[id]/replies | 返信作成 |
| DELETE | /api/replies/[id] | 返信削除 |

## Vercelへのデプロイ

### 1. GitHubにプッシュ

```bash
git add .
git commit -m "Update: Next.js migration"
git push origin main
```

### 2. Vercelでインポート

1. https://vercel.com にアクセス
2. **New Project** をクリック
3. GitHubリポジトリを選択
4. **Environment Variables** を設定：

| キー | 値 |
|------|-----|
| `DATABASE_URL` | Neonの接続文字列 |
| `APP_URL` | VercelのデプロイURL（例: https://lexical-comments.vercel.app） |
| `GITHUB_ID` | GitHub OAuth Client ID（オプション） |
| `GITHUB_SECRET` | GitHub OAuth Client Secret（オプション） |

### 3. デプロイ

**Deploy** ボタンをクリック。数分で完了します。

## カスタマイズ

### テーマの編集
`app/globals.css` でCSS変数を変更してテーマを変更できます：

```css
:root {
  --accent: #58a6ff;      /* アクセントカラー */
  --bg: #0d1117;         /* 背景色 */
  --text: #8b949e;       /* テキスト色 */
}
```

### 書式の追加
`components/LexicalEditorComponent.tsx`の`SUPPORTED_FORMATS`配列に新しい書式を追加できます。

## ライセンス

MIT
