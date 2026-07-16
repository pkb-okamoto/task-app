import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import WorkspaceRoot from "@/components/WorkspaceRoot";
import BrowserNotification from "@/components/BrowserNotification";
import { getTasks } from "@/lib/actions/tasks";
import { getUsers } from "@/lib/actions/users";
import { getGroups } from "@/lib/actions/groups";
import { getWorkspaces } from "@/lib/actions/workspaces";
import { getCurrentUser } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { type Task, type User, type Group, type Workspace } from "@/lib/types";

// サーバーコンポーネント：認証チェック後にデータを取得してWorkspaceRootに渡す
export default async function Home() {
  let currentUser: User | null = null;
  let tasks: Task[] = [];
  let users: User[] = [];
  let groups: Group[] = [];
  let workspaces: Workspace[] = [];
  let googleConnected = false;

  try {
    currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect("/login");
    }

    const supabase = await createClient();
    const [usersResult, workspacesResult, googleToken] = await Promise.all([
      getUsers(),
      getWorkspaces(),
      supabase.from("user_google_tokens").select("user_id").eq("user_id", currentUser.id).maybeSingle(),
    ]);

    users = usersResult;
    workspaces = workspacesResult;
    googleConnected = !!googleToken.data;

    // 最初のワークスペースのタスク・グループを取得
    const firstWorkspaceId = workspaces[0]?.id ?? null;
    const [tasksResult, groupsResult] = await Promise.all([
      getTasks(firstWorkspaceId),
      getGroups(firstWorkspaceId),
    ]);
    tasks = tasksResult;
    groups = groupsResult;
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.warn("Supabase未接続: モックUIで表示します");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <WorkspaceRoot
        currentUser={currentUser}
        initialTasks={tasks}
        initialGroups={groups}
        users={users}
        workspaces={workspaces}
        googleConnected={googleConnected}
      />
      <BrowserNotification currentUser={currentUser} />
    </div>
  );
}
