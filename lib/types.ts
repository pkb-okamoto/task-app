// アプリ全体で使う型定義

export type Priority = '緊急' | '高' | '中' | '低'
export type GroupColor = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'

export interface User {
  id: string
  name: string
  avatar_url: string | null
}

// カスタムグループ
export interface Group {
  id: string
  name: string
  color: GroupColor
  position: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  group_status: string   // 後方互換のため残す
  group_id: string | null
  due_date: string | null
  progress: number       // 0〜100
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
