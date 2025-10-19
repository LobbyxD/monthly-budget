// src/lib/households.ts
import { supabase } from "../lib/supabaseClient";
import type {
  HouseholdRow,
  HouseholdMemberRow,
  HouseholdPermissionRow,
  UserLite,
} from "../types/households";

/** Get all households for the current user via membership */
export async function getMyHouseholds(userId: string) {
  const { data, error } = await supabase
    .from("household_members")
    .select(
      "households:household_id(id, public_id, name, color, creator_id, created_at)"
    )
    .eq("user_id", userId);

  if (error) throw error;

  const households: HouseholdRow[] = (data ?? [])
    .map((r: any) => r.households)
    .filter(Boolean);

  return households;
}

/** Get membership + permissions for current user in a household */
export async function getMyMembership(householdId: number, userId: string) {
  const { data, error } = await supabase
    .from("household_members")
    .select(
      "id, household_id, user_id, permission_id, joined_at, household_permissions:permission_id(id, is_admin, can_edit, can_delete, can_invite)"
    )
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data as
    | (HouseholdMemberRow & { household_permissions: HouseholdPermissionRow })
    | null;
}

/** Create household and attach creator as admin (with default full perms) */
export async function createHousehold({
  name,
  color,
  creatorId,
}: {
  name: string;
  color: string;
  creatorId: string;
}) {
  const { data: h, error: hErr } = await supabase
    .from("households")
    .insert([{ name, color, creator_id: creatorId }])
    .select()
    .single();
  if (hErr) throw hErr;

  const { data: perm, error: pErr } = await supabase
    .from("household_permissions")
    .insert([
      { is_admin: true, can_edit: true, can_delete: true, can_invite: true },
    ])
    .select()
    .single();
  if (pErr) throw pErr;

  const { error: mErr } = await supabase
    .from("household_members")
    .insert([
      { household_id: h.id, user_id: creatorId, permission_id: perm.id },
    ]);
  if (mErr) throw mErr;

  return h as HouseholdRow;
}

/* ---------------------------------------------------------
   🧩 List members + normalize arrays from Supabase joins
--------------------------------------------------------- */
type RawMember = HouseholdMemberRow & {
  household_permissions:
    | HouseholdPermissionRow
    | HouseholdPermissionRow[]
    | null;
  users: UserLite | UserLite[] | null;
};

export async function listHouseholdMembers(householdId: number) {
  const { data, error } = await supabase
    .from("household_members")
    .select(
      `
      id, household_id, user_id, permission_id, joined_at,
      household_permissions:permission_id(id, is_admin, can_edit, can_delete, can_invite),
      users:user_id(auth_id, firstName, lastName, fav_color, public_id)
    `
    )
    .eq("household_id", householdId)
    .order("id");

  if (error) throw error;

  const rows = (data ?? []) as RawMember[];

  const normalized = rows.map((r) => {
    const perm = Array.isArray(r.household_permissions)
      ? r.household_permissions[0] ?? null
      : r.household_permissions;
    const usr = Array.isArray(r.users) ? r.users[0] ?? null : r.users;

    if (!perm || !usr)
      throw new Error(
        "listHouseholdMembers: Missing joined permission or user row"
      );

    return {
      id: r.id,
      household_id: r.household_id,
      user_id: r.user_id,
      permission_id: r.permission_id,
      joined_at: r.joined_at,
      household_permissions: perm,
      users: usr,
    };
  });

  return normalized as Array<
    HouseholdMemberRow & {
      household_permissions: HouseholdPermissionRow;
      users: UserLite;
    }
  >;
}

/* ---------------------------------------------------------
   ✏️ Update operations
--------------------------------------------------------- */
export async function updateHousehold(
  householdId: number,
  patch: Partial<Pick<HouseholdRow, "name" | "color">>
) {
  const { error } = await supabase
    .from("households")
    .update(patch)
    .eq("id", householdId);
  if (error) throw error;
}

export async function updateMemberPermissions(
  permissionId: number,
  patch: Partial<HouseholdPermissionRow>
) {
  const { error } = await supabase
    .from("household_permissions")
    .update(patch)
    .eq("id", permissionId);
  if (error) throw error;
}

export async function removeMember(memberId: number) {
  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

/* ---------------------------------------------------------
   🤝 Inviting + adding members
--------------------------------------------------------- */
// src/lib/households.ts
export async function searchUsersToInvite(householdId: number, query: string) {
  // 1️⃣ Get existing household members to exclude them from results
  const members = await listHouseholdMembers(householdId);
  const already = new Set(members.map((m) => m.users.auth_id));

  // 2️⃣ Search user_profiles view (joins public.users + auth.users.email)
  const { data, error } = await supabase
    .from("user_profiles")
    .select("auth_id, firstName, lastName, fav_color, public_id, email")
    .or(
      `email.ilike.%${query}%,firstName.ilike.%${query}%,lastName.ilike.%${query}%`
    )
    .limit(25);

  if (error) {
    console.error("[searchUsersToInvite] query failed:", error);
    throw error;
  }

  // 3️⃣ Filter out users already in the household
  const filtered = (data ?? []).filter((u) => !already.has(u.auth_id));

  // 4️⃣ Return typed result
  return filtered as (UserLite & { email?: string | null })[];
}

export async function addMember(householdId: number, userId: string) {
  const { data: perm, error: pErr } = await supabase
    .from("household_permissions")
    .insert([
      {
        is_admin: false,
        can_edit: false,
        can_delete: false,
        can_invite: false,
      },
    ])
    .select()
    .single();
  if (pErr) throw pErr;

  const { error: mErr } = await supabase
    .from("household_members")
    .insert([
      { household_id: householdId, user_id: userId, permission_id: perm.id },
    ]);
  if (mErr) throw mErr;
}
