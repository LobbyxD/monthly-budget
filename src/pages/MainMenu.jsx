import { useEffect, useState, useRef } from "react"; // ⬅ added useRef
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
// MainMenu.jsx
import "../style/global.css";
import "../style/mainmenu.css";
import { HexColorPicker } from "react-colorful";

export default function MainMenu() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  // ✨ Color edit state (custom picker)
  const [selectedUserForColor, setSelectedUserForColor] = useState(null);
  const [colorPreview, setColorPreview] = useState(null); // {id, value} live preview
  const [colorDraft, setColorDraft] = useState("#3b82f6"); // local draft in modal
  const [showColorModal, setShowColorModal] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("id");
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
    setLoading(false);
  };

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
    return () => supabase.removeChannel(channel);
  }, []);

  /* -----------------------------
     Color Picker: Open / Preview
  ------------------------------*/
  const openColorPicker = (e, user) => {
    e.stopPropagation();
    const initial = user.fav_color || "#3b82f6";
    setSelectedUserForColor(user);
    setColorDraft(initial); // local working color
    setColorPreview({ id: user.id, value: initial }); // start preview at current
    setShowColorModal(true); // show our modal
  };

  // Live preview as the user moves the picker — no DB writes
  const handleDraftChange = (input) => {
    // input can be either a string (from HexColorPicker) or an event (from input field)
    const value = typeof input === "string" ? input : input.target.value;

    setColorDraft(value);

    if (selectedUserForColor) {
      setColorPreview({ id: selectedUserForColor.id, value });
    }
  };

  // Cancel: close + revert preview (no DB write)
  const cancelColorPicker = () => {
    setShowColorModal(false);
    setColorPreview(null);
    setSelectedUserForColor(null);
    setColorDraft("#3b82f6");
    setSavingColor(false);
  };

  // OK: write to DB and finalize preview
  const confirmColorPicker = async () => {
    if (!selectedUserForColor) return;
    const userId = selectedUserForColor.id;
    const newColor = colorDraft;
    const original = selectedUserForColor.fav_color || "#3b82f6";

    // nothing changed
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

      // reflect in local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, fav_color: newColor } : u))
      );
    } catch (err) {
      console.error("Failed to update color:", err.message);
    } finally {
      setSavingColor(false);
      setShowColorModal(false);
      setColorPreview(null);
      setSelectedUserForColor(null);
    }
  };

  /* -----------------------------
     Create / Delete user … (unchanged)
  ------------------------------*/

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const username = newUsername.trim();
    if (!username) {
      setErrorMsg("Please enter a username.");
      return;
    }

    // 🔹 Check case-insensitive existence
    const { data: existingUser, error: checkErr } = await supabase
      .from("users")
      .select("id")
      .ilike("username", username);

    if (checkErr) {
      console.error("Error checking user:", checkErr.message);
      setErrorMsg("Unable to verify username. Please try again.");
      return;
    }

    if (existingUser && existingUser.length > 0) {
      setErrorMsg("This username already exists.");
      return;
    }

    const { error } = await supabase.from("users").insert([{ username }]);

    if (error) {
      console.error(error.message);
      setErrorMsg("An unexpected error occurred. Please try again.");
      return;
    }

    // ✅ Success — close cleanly
    setShowModal(false);
    setNewUsername("");
    setErrorMsg("");
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const user = users.find((u) => u.id === id);
    setConfirmDeleteUser(user); // open custom confirmation modal
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

  // open modal (reset fields)
  const openCreateModal = () => {
    setNewUsername("");
    setErrorMsg("");
    setShowModal(true);
  };

  // cancel button handler
  const handleCancelCreate = () => {
    setShowModal(false);
    setNewUsername("");
    setErrorMsg("");
  };

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <h2>Household Members</h2>
          <button className="create-btn" onClick={() => setShowModal(true)}>
            + Create
          </button>
        </div>

        {confirmDeleteUser && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Delete User</h2>
              <p style={{ marginBottom: "1.4rem", color: "var(--muted-text)" }}>
                Are you sure you want to delete{" "}
                <strong style={{ color: "var(--text)" }}>
                  {confirmDeleteUser.username}
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
                onClick={() =>
                  navigate(`/user/${user.id}`, {
                    state: { username: user.username },
                  })
                }
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
                    {user.username?.[0]?.toUpperCase() || "?"}
                  </div>

                  <h2>{user.username}</h2>
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
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create User</h2>
            <form onSubmit={handleCreateUser}>
              <input
                type="text"
                placeholder="Enter username..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={errorMsg ? "input-error" : ""}
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
      {/* 🎨 Our custom Color Picker Modal */}
      {showColorModal && selectedUserForColor && (
        <div className="modal-overlay" onClick={cancelColorPicker}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Avatar Color</h2>

            <div className="color-picker-top">
              <div
                className="avatar color-preview-avatar"
                style={{ backgroundColor: colorDraft }}
              >
                {selectedUserForColor.username?.[0]?.toUpperCase() || "?"}
              </div>

              <div className="color-picker-panel">
                <div className="color-picker-inner">
                  {/* 🎨 Vertical Swatches */}
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

                  {/* 🎛 Actual color picker */}
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
