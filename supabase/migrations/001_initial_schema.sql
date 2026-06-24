-- =========================================
-- 001_initial_schema.sql
-- タスク管理アプリ 初期スキーマ
-- =========================================

-- ユーザーテーブル（Supabase Authのauth.usersと連携）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- タスクテーブル
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  group_status TEXT NOT NULL DEFAULT '未着手'
    CHECK (group_status IN ('未着手', '進行中', '完了')),
  due_date DATE,
  progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  priority TEXT NOT NULL DEFAULT '中'
    CHECK (priority IN ('緊急', '高', '中', '低')),
  -- 親タスクID（サブタスクの場合に設定）
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- タスク担当者テーブル（タスクとユーザーの多対多）
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- =========================================
-- インデックス
-- =========================================

-- ステータスごとの絞り込みを高速化
CREATE INDEX IF NOT EXISTS idx_tasks_group_status ON public.tasks(group_status);

-- 親タスクIDでサブタスクを取得するための索引
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- 担当者IDでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);

-- =========================================
-- updated_at 自動更新トリガー
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================
-- Row Level Security (RLS)
-- =========================================

-- usersテーブルのRLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全員のプロフィールを参照可能（担当者表示のため）
CREATE POLICY "認証済みユーザーはusersを参照可能"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "自分のプロフィールのみ更新可能"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- サインアップ時に自動でusersレコードを作成するため、insertは許可
CREATE POLICY "自分のプロフィールを作成可能"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- tasksテーブルのRLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全タスクを参照・操作可能（チーム共有）
CREATE POLICY "認証済みユーザーはtasksを参照可能"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "認証済みユーザーはtasksを作成可能"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "認証済みユーザーはtasksを更新可能"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "認証済みユーザーはtasksを削除可能"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (true);

-- task_assigneesテーブルのRLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "認証済みユーザーはtask_assigneesを参照可能"
  ON public.task_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "認証済みユーザーはtask_assigneesを作成可能"
  ON public.task_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "認証済みユーザーはtask_assigneesを削除可能"
  ON public.task_assignees FOR DELETE
  TO authenticated
  USING (true);

-- =========================================
-- サインアップ時にusersレコードを自動作成する関数
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersへのINSERT後にトリガー
CREATE OR REPLACE TRIGGER trigger_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
