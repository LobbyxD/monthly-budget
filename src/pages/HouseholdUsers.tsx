// src/pages/HouseholdUsers.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { listHouseholdMembers, getMyMembership } from "../lib/households";
import type { HouseholdRow } from "../types/households";
import "../style/global.css";
import "../style/mainmenu.css";

export default function HouseholdUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { public_id } = useParams(); // household public uuid

  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amAdmin, setAmAdmin] = useState(false);

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

        const membership = await getMyMembership(h.id, user.id);
        setAmAdmin(!!membership?.household_permissions?.is_admin);

        const list = await listHouseholdMembers(h.id);
        setMembers(list);
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
          <h2>{household.name}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {amAdmin && (
              <button
                className="create-btn"
                onClick={() => navigate(`/households/${public_id}/admin`)}
                title="Manage household"
              >
                ⚙ Manage
              </button>
            )}
          </div>
        </div>

        {members.length === 0 ? (
          <p className="message">No members yet.</p>
        ) : (
          <div className="user-grid">
            {members.map((m) => {
              const u = m.users;
              const initials = `${(u.firstName?.[0] ?? "").toUpperCase()}${(
                u.lastName?.[0] ?? ""
              ).toUpperCase()}`;
              return (
                <div
                  key={m.id}
                  className="user-card clickable"
                  onClick={() => {
                    if (u.public_id) navigate(`/user/${u.public_id}`);
                  }}
                >
                  <div className="user-left">
                    <div
                      className="avatar"
                      style={{
                        backgroundColor: u.fav_color || "var(--avatar-bg)",
                      }}
                    >
                      {initials || "U"}
                    </div>
                    <h2>
                      {u.firstName} {u.lastName}
                    </h2>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
