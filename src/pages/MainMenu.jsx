import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../style/global.css";

export default function MainMenu() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("*").order("id");
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    const channel = supabase
      .channel("public:users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, fetchUsers)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const { error } = await supabase.from("users").insert([{ username: newUsername.trim() }]);
    if (error) alert(error.message);
    else {
      setShowModal(false);
      setNewUsername("");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this user?")) return;
    setDeletingId(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) alert(error.message);
    setDeletingId(null);
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
                onClick={() => navigate(`/user/${user.id}`, { state: { username: user.username } })}
              >
                <div className="avatar">
                  {user.username?.[0]?.toUpperCase() || "?"}
                </div>
                <h2>{user.username}</h2>
                <p className="date">
                  {user.creation_date
                    ? new Date(user.creation_date).toLocaleDateString()
                    : "—"}
                </p>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDelete(user.id, e)}
                  disabled={deletingId === user.id}
                >
                  {deletingId === user.id ? "Deleting..." : "Delete"}
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
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
