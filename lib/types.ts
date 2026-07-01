// アプリ全体で使う型定義

export type Priority = '緊急' | '高' | '中' | '低'
export type GroupColor = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'

export interface User {
  id: string
  name: string
  avatar_url: string | null
  color?: string
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
  due_time: string | null
  progress: number       // 0〜100
  notes: string | null
  priority: Priority
  alert_days: number | null  // 期限X日前に通知（nullは通知なし）
  parent_task_id: string | null
  position: number | null
  created_at: string
  assignees?: User[]
  subtasks?: Task[]
  attachment_count?: number
}

export interface TaskAssignee {
  task_id: string
  user_id: string
}

export interface Workspace {
  id: string
  name: string
  created_by: string | null
  created_at: string
  is_personal: boolean
}

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: string
  user?: User
}
