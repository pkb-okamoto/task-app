"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TaskBoard from "@/components/TaskBoard";
import Dashboard from "@/components/Dashboard";
import GoogleCalendarView from "@/components/GoogleCalendarView";
import WorkspaceDialog from "@/components/WorkspaceDialog";
import { createWorkspace, getWorkspaces, getWorkspaceMembers } from "@/lib/actions/workspaces";
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
  const [view, setView] = useState<"board" | "dashboard" | "calendar">("board");
  const [manageTarget, setManageTarget] = useState<Workspace | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  // 初期メンバー取得
  useEffect(() => {
    if (initialWorkspaces[0]?.id) {
      getWorkspaceMembers(initialWorkspaces[0].id).then(setWorkspaceMembers);
    }
  }, []);

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

  // 現在のワークスペースのデータを再取得
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
      const [newTasks, newGroups, updated, members] = await Promise.all([
        getTasks(workspaceId),
        getGroups(workspaceId),
        getWorkspaces(),
        getWorkspaceMembers(workspaceId),
      ]);
      setTasks(newTasks);
      setGroups(newGroups);
      setWorkspaces(updated);
      setWorkspaceMembers(members);
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
          workspaceMembers={workspaceMembers}
          onSwitch={handleWorkspaceSwitch}
          onManage={handleManage}
          view={view}
          onViewChange={setView}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          {view === "dashboard" ? (
            <Dashboard tasks={tasks} groups={groups} users={users} />
          ) : view === "calendar" ? (
            <GoogleCalendarView />
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
        onMembersChange={(members) => setWorkspaceMembers(members)}
      />
    </WorkspaceContext.Provider>
  );
}
