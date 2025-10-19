// src/pages/HouseholdAdmin.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  listHouseholdMembers,
  getMyMembership,
  updateHousehold,
  updateMemberPermissions,
  removeMember,
  searchUsersToInvite,
  addMember,
} from "../lib/households";
import type { HouseholdRow, HouseholdPermissionRow } from "../types/households";
import "../style/global.css";
import "../style/mainmenu.css";

export default function HouseholdAdmin() {
  const { public_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [draftPermissions, setDraftPermissions] = useState<
    Record<number, HouseholdPermissionRow>
  >({}); // local copy of checkbox
  const [loading, setLoading] = useState(true);
  const [amAdmin, setAmAdmin] = useState(false);

  const [myPermissions, setMyPermissions] =
    useState<HouseholdPermissionRow | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);

  // invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Detect if any permission differs between draft and original
  const hasUnsavedChanges = useMemo(() => {
    return members.some((m) => {
      const d = draftPermissions[m.id];
      const o = m.household_permissions;
      if (!d) return false;
      return (
        d.is_admin !== o.is_admin ||
        d.can_edit !== o.can_edit ||
        d.can_delete !== o.can_delete ||
        d.can_invite !== o.can_invite
      );
    });
  }, [members, draftPermissions]);

  useEffect(() => {
    async function load() {
      if (!public_id || !user?.id) return;
      setLoading(true);
      try {
        const { data: h, error: hErr } = await supabase
          .from("households")
          .select("*")
          .eq("public_id", public_id)
          .maybeSingle();
        if (hErr) throw hErr;
        if (!h) {
          setLoading(false);
          return;
        }

        setHousehold(h);
        setNameDraft(h.name);
        setColorDraft(h.color || "#3b82f6");

        const membership = await getMyMembership(h.id, user.id);
        const perms = membership?.household_permissions;
        setMyPermissions(perms || null);

        const isAdmin = !!perms?.is_admin;
        setAmAdmin(isAdmin);

        if (!isAdmin) {
          // hard redirect if not admin
          navigate(`/households/${public_id}`, { replace: true });
          return;
        }

        const list = await listHouseholdMembers(h.id);
        setMembers(list);

        // init checkbox draft
        setDraftPermissions(() =>
          Object.fromEntries(
            list.map((m) => [m.id, { ...m.household_permissions }])
          )
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [public_id, user?.id]);

  if (loading)
    return (
      <div className="page">
        <div className="panel">
          <p>Loading…</p>
        </div>
      </div>
    );
  if (!household)
    return (
      <div className="page">
        <div className="panel">
          <p>Household not found.</p>
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <h2>Manage: {household.name}</h2>
          <button
            className="menu-btn"
            onClick={() => navigate(`/households/${public_id}`)}
          >
            Back
          </button>
        </div>

        {/* 1) Avatar color + name */}
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            className="avatar color-preview-avatar"
            style={{ backgroundColor: colorDraft }}
          >
            HH
          </div>
          <div style={{ flex: 1 }}>
            <HexColorPicker color={colorDraft} onChange={setColorDraft} />
            <input
              style={{ marginTop: 8 }}
              value={colorDraft}
              onChange={(e) => setColorDraft(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <div className="modal-actions" style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  setNameDraft(household.name);
                  setColorDraft(household.color || "#3b82f6");
                }}
                disabled={saving}
              >
                Reset
              </button>
              <button
                onClick={async () => {
                  try {
                    setSaving(true);
                    await updateHousehold(household.id, {
                      name: nameDraft.trim(),
                      color: colorDraft,
                    });
                    setSaving(false);
                    alert("Household updated");
                  } catch (e) {
                    setSaving(false);
                    console.error(e);
                    alert("Failed to update");
                  }
                }}
                disabled={saving || !nameDraft.trim()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* 2 + 5) Members + permissions matrix */}
        <h3 style={{ margin: "1rem 0" }}>Members & Permissions</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="budget-table" style={{ textAlign: "left" }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Admin</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Invite</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const u = m.users;
                const p = m.household_permissions as HouseholdPermissionRow;
                const initials = `${(u.firstName?.[0] ?? "").toUpperCase()}${(
                  u.lastName?.[0] ?? ""
                ).toUpperCase()}`;
                const onToggle =
                  (key: keyof HouseholdPermissionRow) =>
                  async (e: React.ChangeEvent<HTMLInputElement>) => {
                    try {
                      await updateMemberPermissions(p.id, {
                        [key]: e.target.checked,
                      } as any);
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update permission");
                    }
                  };

                const changed =
                  draftPermissions[m.id]?.is_admin !== p.is_admin ||
                  draftPermissions[m.id]?.can_edit !== p.can_edit ||
                  draftPermissions[m.id]?.can_delete !== p.can_delete ||
                  draftPermissions[m.id]?.can_invite !== p.can_invite;

                const isCreator = household.creator_id === m.users.auth_id;

                return (
                  <tr key={m.id} className={changed ? "row-dirty" : ""}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: u.fav_color || "var(--avatar-bg)",
                          }}
                        >
                          {initials || "U"}
                        </div>
                        <div>
                          {isCreator && (
                            <span className="creator-badge">👑 &nbsp;</span>
                          )}
                          {u.firstName} {u.lastName}
                        </div>
                      </div>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={draftPermissions[m.id]?.is_admin || false}
                        disabled={isCreator} // 🔹 Creator always admin
                        onChange={(e) =>
                          setDraftPermissions((prev) => ({
                            ...prev,
                            [m.id]: {
                              ...prev[m.id],
                              is_admin: e.target.checked,
                            },
                          }))
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="checkbox"
                        checked={draftPermissions[m.id]?.can_edit || false}
                        onChange={(e) =>
                          setDraftPermissions((prev) => ({
                            ...prev,
                            [m.id]: {
                              ...prev[m.id],
                              can_edit: e.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={draftPermissions[m.id]?.can_delete || false}
                        onChange={(e) =>
                          setDraftPermissions((prev) => ({
                            ...prev,
                            [m.id]: {
                              ...prev[m.id],
                              can_delete: e.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={draftPermissions[m.id]?.can_invite || false}
                        onChange={(e) =>
                          setDraftPermissions((prev) => ({
                            ...prev,
                            [m.id]: {
                              ...prev[m.id],
                              can_invite: e.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      {p.can_delete && user && u.auth_id !== user.id && (
                        <button
                          className="delete-btn"
                          onClick={async () => {
                            if (
                              !confirm(`Remove ${u.firstName} ${u.lastName}?`)
                            )
                              return;

                            // 🔹 Double-check permissions before deleting
                            if (!user?.id) {
                              alert("User not authenticated");
                              return;
                            }
                            const latest = await getMyMembership(
                              household.id,
                              user.id
                            );
                            if (!latest?.household_permissions?.can_delete) {
                              alert(
                                "You no longer have permission to remove users."
                              );
                              return;
                            }

                            try {
                              await removeMember(m.id);
                              setMembers((prev) =>
                                prev.filter((x) => x.id !== m.id)
                              );
                            } catch (e) {
                              console.error(e);
                              alert("Failed to remove member");
                            }
                          }}
                        >
                          X
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Save all permission changes */}
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button
            className="create-btn"
            disabled={!hasUnsavedChanges}
            onClick={async () => {
              try {
                for (const m of members) {
                  const draft = draftPermissions[m.id];
                  if (!draft) continue;

                  const original = m.household_permissions;
                  const hasDiff = Object.keys(draft).some(
                    (key) => (draft as any)[key] !== (original as any)[key]
                  );

                  if (hasDiff) {
                    await updateMemberPermissions(
                      m.household_permissions.id,
                      draft
                    );
                  }
                }

                alert("Permissions saved successfully!");

                // Refresh the data from Supabase after saving
                const fresh = await listHouseholdMembers(household!.id);
                setMembers(fresh);
                setDraftPermissions(
                  Object.fromEntries(
                    fresh.map((m) => [m.id, { ...m.household_permissions }])
                  )
                );
              } catch (err) {
                console.error(err);
                alert("Failed to save permissions.");
              }
            }}
          >
            Save Changes
          </button>
        </div>

        {/* 3) Invite (search + add) */}
        {myPermissions?.can_invite && (
          <div style={{ marginTop: 16 }}>
            <button
              className="create-btn"
              onClick={() => setShowInvite(true)}
              title="Invite user"
            >
              ＋ Invite
            </button>
          </div>
        )}

        {showInvite && (
          <div className="modal-overlay" onClick={() => setShowInvite(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Invite user</h2>
              <input
                type="text"
                placeholder="Search by email, first or last name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div
                className="modal-actions"
                style={{ justifyContent: "space-between" }}
              >
                <button onClick={() => setShowInvite(false)}>Close</button>
                <button
                  onClick={async () => {
                    if (!household || !query.trim()) return;
                    try {
                      setSearching(true);
                      const res = await searchUsersToInvite(
                        household.id,
                        query.trim()
                      );
                      setResults(res);
                    } catch (e) {
                      console.error(e);
                      alert("Search failed");
                    } finally {
                      setSearching(false);
                    }
                  }}
                  disabled={searching || !query.trim()}
                >
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>

              {results.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {results.map((u) => (
                    <div
                      key={u.auth_id}
                      className="user-card"
                      style={{ marginBottom: 8 }}
                    >
                      <div className="user-left">
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: u.fav_color || "var(--avatar-bg)",
                          }}
                        >
                          {(u.firstName?.[0] ?? "U").toUpperCase()}
                          {(u.lastName?.[0] ?? "").toUpperCase()}
                        </div>
                        <h2>
                          {u.firstName} {u.lastName}
                        </h2>
                      </div>
                      <button
                        className="create-btn"
                        onClick={async () => {
                          // 🔹 Final permission check before adding
                          if (!user?.id) {
                            alert("User not authenticated");
                            return;
                          }

                          const latest = await getMyMembership(
                            household.id,
                            user.id
                          );
                          if (!latest?.household_permissions?.can_invite) {
                            alert(
                              "You no longer have permission to invite users."
                            );
                            return;
                          }

                          try {
                            await addMember(household!.id, u.auth_id);
                            setResults((prev) =>
                              prev.filter((x) => x.auth_id !== u.auth_id)
                            );
                            const fresh = await listHouseholdMembers(
                              household!.id
                            );
                            setMembers(fresh);
                          } catch (e) {
                            console.error(e);
                            alert("Failed to add member");
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
