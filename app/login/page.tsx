import { LayoutDashboard } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

// ログイン・サインアップページ
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <LayoutDashboard className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900 tracking-tight">TaskBoard</span>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
