// アカウントカラーの定義
export const USER_COLORS = [
  { value: "blue",   label: "ブルー",   bg: "bg-blue-500",   text: "text-blue-600",   ring: "ring-blue-400"   },
  { value: "red",    label: "レッド",   bg: "bg-red-500",    text: "text-red-600",    ring: "ring-red-400"    },
  { value: "green",  label: "グリーン", bg: "bg-green-500",  text: "text-green-600",  ring: "ring-green-400"  },
  { value: "yellow", label: "イエロー", bg: "bg-yellow-400", text: "text-yellow-600", ring: "ring-yellow-400" },
  { value: "purple", label: "パープル", bg: "bg-purple-500", text: "text-purple-600", ring: "ring-purple-400" },
  { value: "pink",   label: "ピンク",   bg: "bg-pink-500",   text: "text-pink-600",   ring: "ring-pink-400"   },
  { value: "orange", label: "オレンジ", bg: "bg-orange-500", text: "text-orange-600", ring: "ring-orange-400" },
  { value: "teal",   label: "ティール", bg: "bg-teal-500",   text: "text-teal-600",   ring: "ring-teal-400"   },
] as const;

export type UserColor = typeof USER_COLORS[number]["value"];

export function getColorStyle(color: string) {
  return USER_COLORS.find((c) => c.value === color) ?? USER_COLORS[0];
}
