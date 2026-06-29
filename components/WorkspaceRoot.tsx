"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TaskBoard from "@/components/TaskBoard";
import Dashboard from "@/components/Dashboard";
import WorkspaceDialog from "@/components/WorkspaceDialog";
import { createWorkspace, getWorkspaces } from "@/lib/actions/workspaces";
import { getTasks } from "@/lib/actions/tasks";
import { getGroups } from "@/lib/actions/groups";
import { WorkspaceContext } from "@/lib/workspace-context";
import { type Group, type Task, type User, type Workspace } from "@/lib/types";

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
  const [view, setView] = useState<"board" | "dashboard">("board");
  const [manageTarget, setManageTarget] = useState<Workspace | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  // ワークスペースが1つもない場合、デフォルトを自動作成
  useEffect(() => {
    if (initialWorkspaces.length === 0 && currentUser) {
      startTransition(async () => {
        const ws = await createWorkspace("マイワークスペース");
        setWorkspaces([ws]);
        setCurrentWorkspaceId(ws.id);
      });
    }
  }, []);

  // 現在のワークスペースのデータを再取得（インライン編集後などに使用）
  const refresh = useCallback(async () => {
    const [newTasks, newGroups] = await Promise.all([
      getTasks(currentWorkspaceId),
      getGroups(currentWorkspaceId),
    ]);
    setTasks(newTasks);
    setGroups(newGroups);
  }, [currentWorkspaceId]);

  // ワークスペース切り替え
  const handleWorkspaceSwitch = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    startTransition(async () => {
      const [newTasks, newGroups, updated] = await Promise.all([
        getTasks(workspaceId),
        getGroups(workspaceId),
        getWorkspaces(),
      ]);
      setTasks(newTasks);
      setGroups(newGroups);
      setWorkspaces(updated);
    });
  };

  const handleManage = (ws: Workspace) => {
    setManageTarget(ws);
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
          onSwitch={handleWorkspaceSwitch}
          onManage={handleManage}
          view={view}
          onViewChange={setView}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          {view === "dashboard" ? (
            <Dashboard tasks={tasks} groups={groups} users={users} />
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
      />
    </WorkspaceContext.Provider>
  );
}
