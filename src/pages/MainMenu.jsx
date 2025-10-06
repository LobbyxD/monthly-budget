import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FiUser, FiTrash2, FiPlus, FiX } from "react-icons/fi";

export default function MainMenu() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const { error } = await supabase
      .from("users")
      .insert([{ username: newUsername }]);
    if (error) alert(error.message);
    else {
      setShowCreateModal(false);
      setNewUsername("");
      fetchUsers();
    }
  };

  // Delete user
  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) alert(error.message);
    else setUsers(users.filter((u) => u.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center py-12 px-6">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
        <h1 className="text-4xl font-semibold tracking-tight">
          User Management
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-blue-500 transition-all duration-200"
        >
          <FiPlus />
          New User
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-muted text-lg mt-20">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-muted text-lg mt-20">
          No users yet. Add one above!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {users.map((user) => (
            <div
              key={user.id}
              className="relative group bg-surface rounded-2xl p-6 shadow-md hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 border border-gray-800"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <FiUser className="text-2xl text-primary" />
                </div>
                <h2 className="text-xl font-medium mb-1">{user.username}</h2>
                <p className="text-sm text-muted">
                  {user.creation_date
                    ? new Date(user.creation_date).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(user.id)}
                disabled={deletingId === user.id}
                className="absolute top-4 right-4 text-muted hover:text-red-400 transition-colors"
              >
                {deletingId === user.id ? (
                  <span className="text-xs">...</span>
                ) : (
                  <FiTrash2 className="text-lg" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-surface rounded-2xl p-8 w-full max-w-md border border-gray-700 shadow-xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
            >
              <FiX className="text-xl" />
            </button>

            <h2 className="text-2xl font-semibold mb-6 text-primary">
              Create New User
            </h2>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Enter username..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-background border border-gray-700 rounded-lg px-4 py-2 text-text placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                className="bg-primary text-white rounded-lg py-2 font-medium hover:bg-blue-500 transition-all duration-200"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
