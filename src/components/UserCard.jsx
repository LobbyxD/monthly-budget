// src/components/UserCard.jsx
export default function UserCard({ user, onDelete, deletingId }) {
  return (
    <div className="user-card">
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
        onClick={() => onDelete(user.id)}
        disabled={deletingId === user.id}
      >
        {deletingId === user.id ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
