import { useEffect, useState, FormEvent, JSX } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../style/global.css";
import "../style/mainmenu.css";
import { HexColorPicker } from "react-colorful";

/* -----------------------------
   🧩 Supabase table definition
------------------------------*/
interface DBUser {
  id: number;
  firstName: string;
  lastName?: string | null;
  fav_color?: string | null;
  public_id?: string | null;
}

export default function MainMenu(): JSX.Element {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<DBUser | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedUserForColor, setSelectedUserForColor] =
    useState<DBUser | null>(null);
  const [colorPreview, setColorPreview] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [colorDraft, setColorDraft] = useState("#3b82f6");
  const [showColorModal, setShowColorModal] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  const navigate = useNavigate();

  /* -----------------------------
     🔹 Fetch users
  ------------------------------*/
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } else {
      setUsers((data as DBUser[]) ?? []);
    }

    setLoading(false);
  };

  /* -----------------------------
     🔄 Realtime subscription
  ------------------------------*/
  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("public:users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        fetchUsers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* -----------------------------
     🎨 Color Picker
  ------------------------------*/
  const openColorPicker = (e: React.MouseEvent, user: DBUser) => {
    e.stopPropagation();
    const initial = user.fav_color || "#3b82f6";
    setSelectedUserForColor(user);
    setColorDraft(initial);
    setColorPreview({ id: user.id, value: initial });
    setShowColorModal(true);
  };

  const handleDraftChange = (
    input: string | React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = typeof input === "string" ? input : input.target.value;
    setColorDraft(value);
    if (selectedUserForColor) {
      setColorPreview({ id: selectedUserForColor.id, value });
    }
  };

  const cancelColorPicker = () => {
    setShowColorModal(false);
    setColorPreview(null);
    setSelectedUserForColor(null);
    setColorDraft("#3b82f6");
    setSavingColor(false);
  };

  const confirmColorPicker = async () => {
    if (!selectedUserForColor) return;
    const userId = selectedUserForColor.id;
    const newColor = colorDraft;
    const original = selectedUserForColor.fav_color || "#3b82f6";

    if (newColor === original) {
      cancelColorPicker();
      return;
    }

    try {
      setSavingColor(true);
      const { error } = await supabase
        .from("users")
        .update({ fav_color: newColor })
        .eq("id", userId);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, fav_color: newColor } : u))
      );
    } catch (err: any) {
      console.error("Failed to update color:", err.message);
    } finally {
      setSavingColor(false);
      cancelColorPicker();
    }
  };

  /* -----------------------------
     👤 Create / Delete user
  ------------------------------*/
  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const first = newFirstName.trim();
    const last = newLastName.trim();

    if (!first) {
      setErrorMsg("Please enter a first name.");
      return;
    }

    const { data: existingUser, error: checkErr } = await supabase
      .from("users")
      .select("id")
      .ilike("firstName", first);

    if (checkErr) {
      console.error("Error checking user:", checkErr.message);
      setErrorMsg("Unable to verify user. Please try again.");
      return;
    }

    if (existingUser && existingUser.length > 0) {
      setErrorMsg("A user with this first name already exists.");
      return;
    }

    const { error } = await supabase
      .from("users")
      .insert([{ firstName: first, lastName: last || null }]);

    if (error) {
      console.error(error.message);
      setErrorMsg("An unexpected error occurred. Please try again.");
      return;
    }

    setShowModal(false);
    setNewFirstName("");
    setNewLastName("");
    setErrorMsg("");
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = users.find((u) => u.id === id) || null;
    setConfirmDeleteUser(user);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteUser) return;

    setDeletingId(confirmDeleteUser.id);
    setConfirmDeleteUser(null);
    setUsers((prev) => prev.filter((u) => u.id !== confirmDeleteUser.id));

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", confirmDeleteUser.id);
    if (error) alert(error.message);

    setDeletingId(null);
  };

  const openCreateModal = () => {
    setNewFirstName("");
    setNewLastName("");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleCancelCreate = () => {
    setShowModal(false);
    setNewFirstName("");
    setNewLastName("");
    setErrorMsg("");
  };

  /* -----------------------------
     🧱 Render
  ------------------------------*/
  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <h2>Household Members</h2>
          <button className="create-btn" onClick={openCreateModal}>
            + Create
          </button>
        </div>

        {/* Delete modal */}
        {confirmDeleteUser && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Delete User</h2>
              <p style={{ marginBottom: "1.4rem", color: "var(--muted-text)" }}>
                Are you sure you want to delete{" "}
                <strong style={{ color: "var(--text)" }}>
                  {confirmDeleteUser.firstName} {confirmDeleteUser.lastName}
                </strong>
                ? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button onClick={() => setConfirmDeleteUser(null)}>
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    backgroundColor: "var(--delete)",
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User list */}
        {loading ? (
          <p className="message">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="message">No users found. Click “Create”.</p>
        ) : (
          <div className="user-grid">
            {users.map((user) => (
              <div
                key={user.id}
                className="user-card clickable"
                onClick={async () => {
                  try {
                    if (user.public_id) {
                      // ✅ Already has public_id from the initial SELECT *
                      navigate(`/user/${user.public_id}`);
                      return;
                    }

                    // 🩵 Fallback: fetch it manually if not present (for legacy users)
                    const { data, error } = await supabase
                      .from("users")
                      .select("public_id")
                      .eq("id", user.id)
                      .maybeSingle();

                    if (error) {
                      console.error(
                        "❌ Failed to fetch public_id:",
                        error.message
                      );
                      return;
                    }

                    if (data?.public_id) {
                      navigate(`/user/${data.public_id}`);
                    } else {
                      console.warn("⚠️ No public_id found for user:", user.id);
                    }
                  } catch (err) {
                    console.error("❌ Navigation error:", err);
                  }
                }}
              >
                <div className="user-left">
                  <div
                    className="avatar editable-avatar"
                    style={{
                      backgroundColor:
                        colorPreview?.id === user.id
                          ? colorPreview.value
                          : user.fav_color || "var(--avatar-bg)",
                      transition: "background-color 0.2s ease",
                    }}
                    onClick={(e) => openColorPicker(e, user)}
                    title="Click to edit color"
                  >
                    {(user.firstName?.[0] || "").toUpperCase()}
                    {(user.lastName?.[0] || "").toUpperCase()}
                  </div>
                  <h2>
                    {user.firstName} {user.lastName}
                  </h2>
                </div>

                <button
                  className="delete-btn"
                  onClick={(e) => handleDelete(user.id, e)}
                  disabled={deletingId === user.id}
                >
                  {deletingId === user.id ? "Deleting..." : "X"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create User</h2>
            <form onSubmit={handleCreateUser}>
              <input
                type="text"
                placeholder="First name..."
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className={errorMsg ? "input-error" : ""}
                required
              />
              <input
                type="text"
                placeholder="Last name..."
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className={errorMsg ? "input-error" : ""}
                required
              />
              {errorMsg && <p className="error-text">{errorMsg}</p>}
              <div className="modal-actions">
                <button type="button" onClick={handleCancelCreate}>
                  Cancel
                </button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎨 Color picker modal */}
      {showColorModal && selectedUserForColor && (
        <div className="modal-overlay" onClick={cancelColorPicker}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Avatar Color</h2>
            <div className="color-picker-top">
              <div
                className="avatar color-preview-avatar"
                style={{ backgroundColor: colorDraft }}
              >
                {(selectedUserForColor.firstName?.[0] || "").toUpperCase()}
                {(selectedUserForColor.lastName?.[0] || "").toUpperCase()}
              </div>

              <div className="color-picker-panel">
                <div className="color-picker-inner">
                  <div className="color-swatches-vertical">
                    {[
                      "#3b82f6",
                      "#22c55e",
                      "#ef4444",
                      "orange",
                      "#a855f7",
                      "yellow",
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColorDraft(c);
                          setColorPreview({
                            id: selectedUserForColor.id,
                            value: c,
                          });
                        }}
                        style={{
                          backgroundColor: c,
                          border:
                            c.toLowerCase() === colorDraft.toLowerCase()
                              ? "2px solid var(--accent)"
                              : "1px solid var(--border)",
                        }}
                        title={c}
                        className="color-swatch"
                      />
                    ))}
                  </div>

                  <div className="picker-column">
                    <HexColorPicker
                      color={colorDraft}
                      onChange={handleDraftChange}
                    />
                    <input
                      type="text"
                      value={colorDraft}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) {
                          setColorDraft(v);
                          setColorPreview({
                            id: selectedUserForColor.id,
                            value: v,
                          });
                        } else setColorDraft(v);
                      }}
                      placeholder="#3b82f6"
                      aria-label="Hex color"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={cancelColorPicker}
                disabled={savingColor}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmColorPicker}
                disabled={savingColor}
              >
                {savingColor ? "Saving…" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
