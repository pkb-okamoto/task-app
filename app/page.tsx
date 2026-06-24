import { redirect } from "next/navigation";
import Header from "@/components/Header";
import TaskBoard from "@/components/TaskBoard";
import BrowserNotification from "@/components/BrowserNotification";
import { getTasks } from "@/lib/actions/tasks";
import { getUsers } from "@/lib/actions/users";
import { getCurrentUser } from "@/lib/actions/auth";
import { type Task, type User } from "@/lib/types";

// サーバーコンポーネント：認証チェック後にデータを取得してTaskBoardに渡す
export default async function Home() {
  let currentUser: User | null = null;
  let tasks: Task[] = [];
  let users: User[] = [];

  try {
    currentUser = await getCurrentUser();

    // 未ログインはログインページへリダイレクト
    if (!currentUser) {
      redirect("/login");
    }

    [tasks, users] = await Promise.all([getTasks(), getUsers()]);
  } catch (err) {
    // redirect()はエラーをthrowするため再スロー
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    // Supabase未設定時はUIのみ表示
    console.warn("Supabase未接続: モックUIで表示します");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header currentUser={currentUser} />
      <TaskBoard initialTasks={tasks} users={users} />
      {/* アプリ起動時にブラウザ通知をチェック */}
      <BrowserNotification currentUser={currentUser} />
    </div>
  );
}
