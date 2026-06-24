import { redirect } from "next/navigation";
import Header from "@/components/Header";
import TaskBoard from "@/components/TaskBoard";
import BrowserNotification from "@/components/BrowserNotification";
import { getTasks } from "@/lib/actions/tasks";
import { getUsers } from "@/lib/actions/users";
import { getGroups } from "@/lib/actions/groups";
import { getCurrentUser } from "@/lib/actions/auth";
import { type Task, type User, type Group } from "@/lib/types";

// サーバーコンポーネント：認証チェック後にデータを取得してTaskBoardに渡す
export default async function Home() {
  let currentUser: User | null = null;
  let tasks: Task[] = [];
  let users: User[] = [];
  let groups: Group[] = [];

  try {
    currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect("/login");
    }

    [tasks, users, groups] = await Promise.all([getTasks(), getUsers(), getGroups()]);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.warn("Supabase未接続: モックUIで表示します");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header currentUser={currentUser} />
      <TaskBoard initialTasks={tasks} initialGroups={groups} users={users} />
      <BrowserNotification currentUser={currentUser} />
    </div>
  );
}
