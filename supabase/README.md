# Supabase セットアップ手順

## 1. プロジェクト作成

1. https://supabase.com にアクセスしてサインイン
2. 「New Project」でプロジェクトを作成
3. データベースのパスワードを設定（控えておく）

## 2. 環境変数の設定

Supabase ダッシュボード > Project Settings > API から以下をコピーして `.env.local` に貼り付ける：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 3. マイグレーションの実行

Supabase ダッシュボード > SQL Editor を開き、以下の順で実行：

1. `migrations/001_initial_schema.sql` の内容を貼り付けて実行
2. （開発時のみ）`migrations/002_seed_data.sql` の内容を貼り付けて実行

## 4. Auth の設定

Supabase ダッシュボード > Authentication > Providers で「Email」が有効になっていることを確認。
