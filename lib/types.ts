// アプリ全体で使う型定義

export type GroupStatus = '未着手' | '進行中' | '完了'
export type Priority = '緊急' | '高' | '中' | '低'

export interface User {
  id: string
  name: string
  avatar_url: string | null
}

export interface Task {
  id: string
  title: string
  group_status: GroupStatus
  due_date: string | null
  progress: number        // 0〜100
  notes: string | null
  priority: Priority
  parent_task_id: string | null
  created_at: string
  assignees?: User[]
  subtasks?: Task[]
}

export interface TaskAssignee {
  task_id: string
  user_id: string
}
