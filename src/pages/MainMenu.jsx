import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./MainMenu.css";

export default function MainMenu() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("id", { ascending: true });

    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
    setLoading(false);
  };

  // Realtime listener
  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("public:users") // ✅ correct channel naming
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        (payload) => {
          console.log("Realtime change received:", payload);
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const { error } = await supabase
      .from("users")
      .insert([{ username: newUsername.trim() }]);
    if (error) alert(error.message);
    else {
      setShowModal(false);
      setNewUsername("");
    }
  };

  // Delete user (optimistic)
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    setDeletingId(id);
    setUsers((prev) => prev.filter((u) => u.id !== id)); // instant UI update
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      alert(error.message);
      fetchUsers();
    }
    setDeletingId(null);
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Household Users</h1>
        <button className="create-btn" onClick={() => setShowModal(true)}>
          + Create User
        </button>
      </header>

      {loading ? (
        <p className="message">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="message">No users found. Click “Create User”.</p>
      ) : (
        <div className="user-grid">
          {users.map((user) => (
            <div key={user.id} className="user-card">
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
                onClick={() => handleDelete(user.id)}
                disabled={deletingId === user.id}
              >
                {deletingId === user.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

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
