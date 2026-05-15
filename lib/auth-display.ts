type DisplayUser = {
  displayUsername?: string | null;
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

export function getUserDisplayIdentity(user: DisplayUser) {
  const primary =
    user.displayUsername?.trim() ||
    user.username?.trim() ||
    user.email?.trim() ||
    user.name?.trim() ||
    "已登录用户";
  const email = user.email?.trim() || null;

  return {
    primary,
    secondary: email && email !== primary ? email : null
  };
}
