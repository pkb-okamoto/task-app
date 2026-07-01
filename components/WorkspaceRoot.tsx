"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TaskBoard from "@/components/TaskBoard";
import Dashboard from "@/components/Dashboard";
import GoogleCalendarView from "@/components/GoogleCalendarView";
import MemberList from "@/components/MemberList";
import WorkspaceDialog from "@/components/WorkspaceDialog";
import { createWorkspace, getWorkspaceMembers } from "@/lib/actions/workspaces";
import { getTasks } from "@/lib/actions/tasks";
import { getGroups } from "@/lib/actions/groups";
import { WorkspaceContext } from "@/lib/workspace-context";
import { type Group, type Task, type User, type Workspace, type WorkspaceMember } from "@/lib/types";

interface WorkspaceRootProps {
  currentUser: User | null;
  initialTasks: Task[];
  initialGroups: Group[];
  users: User[];
  workspaces: Workspace[];
  googleConnected?: boolean;
}

export default function WorkspaceRoot({
  currentUser,
  initialTasks,
  initialGroups,
  users,
  workspaces: initialWorkspaces,
  googleConnected = false,
}: WorkspaceRootProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    initialWorkspaces[0]?.id ?? null
  );
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [view, setView] = useState<"board" | "dashboard" | "calendar" | "members">("dashboard");
  const [manageTarget, setManageTarget] = useState<Workspace | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ワークスペースが1つもない場合、デフォルトを自動作成
  useEffect(() => {
    if (initialWorkspaces.length === 0 && currentUser) {
      startTransition(async () => {
        const ws = await createWorkspace("共有ワークスペース");
        setWorkspaces([ws]);
        setCurrentWorkspaceId(ws.id);
      });
    }
  }, []);

  // 現在のワークスペースのデータを再取得
  const refresh = useCallback(async () => {
    const [newTasks, newGroups] = await Promise.all([
      getTasks(currentWorkspaceId),
      getGroups(currentWorkspaceId),
    ]);
    setTasks(newTasks);
    setGroups(newGroups);
  }, [currentWorkspaceId]);

  // ワークスペース切り替え：旧コンテンツを残したままロードし、完了後に一括更新
  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) return;
    setCurrentWorkspaceId(workspaceId);
    startTransition(async () => {
      const [newTasks, newGroups] = await Promise.all([
        getTasks(workspaceId),
        getGroups(workspaceId),
      ]);
      setTasks(newTasks);
      setGroups(newGroups);
    });
  };

  // 設定ダイアログを開く
  const handleManage = (workspace: Workspace) => {
    setManageTarget(workspace);
    setDialogOpen(true);
  };

  return (
    <WorkspaceContext.Provider value={{ refresh }}>
      <Header
        currentUser={currentUser}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceSwitch={handleWorkspaceSwitch}
        allUsers={users}
        googleConnected={googleConnected}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          workspaceMembers={workspaceMembers}
          onSwitch={handleWorkspaceSwitch}
          onManage={handleManage}
          view={view}
          onViewChange={setView}
        />
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* ロード中オーバーレイ（コンテンツを隠さず薄暗くするだけ） */}
          {isPending && (
            <div className="absolute inset-0 bg-white/50 z-10 pointer-events-none" />
          )}

          {view === "dashboard" ? (
            <Dashboard tasks={tasks} groups={groups} users={users} />
          ) : view === "calendar" ? (
            <GoogleCalendarView />
          ) : view === "members" ? (
            <MemberList
              workspace={workspaces.find((w) => w.id === currentWorkspaceId) ?? null}
              allUsers={users}
              currentUserId={currentUser?.id ?? ""}
            />
          ) : (
            <TaskBoard
              initialTasks={tasks}
              initialGroups={groups}
              users={users}
              workspaceId={currentWorkspaceId}
            />
          )}
        </div>
      </div>

      <WorkspaceDialog
        workspace={manageTarget}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allUsers={users}
        currentUserId={currentUser?.id ?? ""}
        onMembersChange={setWorkspaceMembers}
      />
    </WorkspaceContext.Provider>
  );
}
