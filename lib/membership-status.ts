export type MembershipType = "non_member" | "permanent_member" | "subscription_member";

export type MembershipAccessState = "non_member" | "member_active" | "member_expired";

type MembershipRecord = {
  membershipType?: MembershipType | null;
  membershipExpiresAt?: string | Date | null;
};

export function getMembershipAccessState(
  user: MembershipRecord | null | undefined,
  now = new Date()
): MembershipAccessState {
  if (!user || !user.membershipType || user.membershipType === "non_member") {
    return "non_member";
  }

  if (user.membershipType === "permanent_member") {
    return "member_active";
  }

  const expiresAt = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null;

  if (!expiresAt) {
    return "member_active";
  }

  return expiresAt.getTime() > now.getTime() ? "member_active" : "member_expired";
}

export function getMembershipTypeLabel(user: MembershipRecord | null | undefined) {
  return user?.membershipType ?? "non_member";
}
