import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少需要 3 个字符")
  .max(30, "用户名最多 30 个字符")
  .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "请输入昵称").max(60, "昵称最多 60 个字符"),
  username: usernameSchema,
  email: z.email("请输入有效邮箱").trim().toLowerCase(),
  password: z.string().min(8, "密码至少需要 8 位").max(128, "密码最多 128 位")
});

export const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "请输入邮箱或用户名")
    .max(254, "邮箱或用户名过长"),
  password: z.string().min(8, "密码至少需要 8 位").max(128, "密码最多 128 位")
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export function getSignInMethod(identifier: string) {
  return identifier.includes("@") ? "email" : "username";
}
