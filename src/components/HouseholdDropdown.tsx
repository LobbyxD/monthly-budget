// src/components/HouseholdDropdown.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HexColorPicker } from "react-colorful";
import { getMyHouseholds, createHousehold } from "../lib/households";
import type { HouseholdRow } from "../types/households";
import "../style/layout.css";

export default function HouseholdDropdown({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<HouseholdRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);
  const canSave = name.trim().length >= 2 && /^#[0-9a-f]{6}$/i.test(color);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const households = await getMyHouseholds(user.id);
      setList(households);
    } catch (e) {
      console.error("[HouseholdDropdown] load:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="dropdown-nested">
      <div className="dropdown-panel">
        <div className="dropdown-title">Households</div>
        {loading ? (
          <div className="dropdown-empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="dropdown-empty">No households yet.</div>
        ) : (
          <ul className="dropdown-list">
            {list.map((h) => (
              <li key={h.id}>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    // Navigate to household user selection page
                    onClose();
                    navigate(`/households/${h.public_id}`);
                  }}
                >
                  <span
                    className="household-dot"
                    style={{ backgroundColor: h.color || "#3b82f6" }}
                  />
                  {h.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="dropdown-sep" />
        <button className="dropdown-item" onClick={() => setShowCreate(true)}>
          ＋ New household
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Household</h2>
            <input
              type="text"
              placeholder="Household name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <div
                className="avatar color-preview-avatar"
                style={{ backgroundColor: color }}
              >
                HH
              </div>
              <div style={{ flex: 1 }}>
                <HexColorPicker color={color} onChange={setColor} />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button onClick={() => setShowCreate(false)} disabled={saving}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!user?.id || !canSave) return;
                  try {
                    setSaving(true);
                    const created = await createHousehold({
                      name: name.trim(),
                      color,
                      creatorId: user.id,
                    });
                    setSaving(false);
                    setShowCreate(false);
                    // go straight in
                    onClose();
                    navigate(`/households/${created.public_id}`);
                  } catch (e) {
                    setSaving(false);
                    console.error(e);
                    alert("Failed to create household");
                  }
                }}
                disabled={!canSave || saving}
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
