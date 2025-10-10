import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../style/global.css";
import "../style/userdashboard.css";

export default function UserDashboard() {
  const { public_id } = useParams();
  const { user } = useAuth(); // Logged-in Supabase user (if any)

  // 🔹 Core state
  const [authId, setAuthId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState("");
  const [transactions, setTransactions] = useState([]);

  // 🔹 Month and date helpers
  const now = new Date();
  const currentMonth = now.getDate() < 10 ? now.getMonth() - 1 : now.getMonth();
  const currentYear =
    now.getDate() < 10 && now.getMonth() === 0
      ? now.getFullYear() - 1
      : now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth < 0 ? 11 : currentMonth);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempMonth, setTempMonth] = useState(month);
  const [tempYear, setTempYear] = useState(year);

  const mirrorRef = useRef(null);
  const salaryRef = useRef(null);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // ---------- Helpers ----------
  const isNonOriginal = (t) => t.parent_id !== null;

  const getBudgetRange = (m, y) => {
    const start = new Date(y, m, 10);
    const end = new Date(y, m + 1, 9);
    return { start, end };
  };
  const { start, end } = useMemo(
    () => getBudgetRange(month, year),
    [month, year]
  );

  const toIso = (d) => d.toISOString().split("T")[0];
  const formatDate = (d) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
  const formatSalaryDisplay = (val) => {
    if (val === "" || val === null || isNaN(val)) return "";
    return Number(val).toLocaleString();
  };

  // ---------- Resolve which user ----------
  useEffect(() => {
    const resolveUser = async () => {
      if (public_id) {
        const { data, error } = await supabase
          .from("users")
          .select("auth_id")
          .eq("public_id", public_id)
          .maybeSingle();

        if (error) {
          console.error("❌ Failed to find user by public_id:", error.message);
        } else if (data?.auth_id) {
          setAuthId(data.auth_id);
        } else {
          console.warn("⚠️ No user found for public_id:", public_id);
          setAuthId(null);
        }
      } else {
        setAuthId(user?.id || null);
      }
    };
    resolveUser();
  }, [public_id, user?.id]);

  // ---------- Fetch all data ----------
  const fetchAll = async () => {
    if (!authId) return;
    setLoading(true);
    try {
      const { data: summary } = await supabase
        .from("monthly_summary")
        .select("salary_amount")
        .eq("user_id", authId)
        .gte("month", toIso(new Date(year, month, 1)))
        .lt("month", toIso(new Date(year, month + 1, 1)))
        .maybeSingle();

      setSalary(summary?.salary_amount ?? "");

      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", authId)
        .gte("created_at", toIso(start))
        .lte("created_at", toIso(end))
        .order("id", { ascending: true });

      setTransactions(txs || []);
    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [authId, month, year]);

  // ---------- Month Navigation ----------
  const changeMonth = (offset) => {
    const newDate = new Date(year, month + offset, 1);
    setYear(newDate.getFullYear());
    setMonth(newDate.getMonth());
  };
  const goToPreviousMonth = () => changeMonth(-1);
  const goToNextMonth = () => changeMonth(1);

  // ---------- Salary ----------
  const saveSalary = async (newValue) => {
    if (!authId) return;
    const numValue = Number(String(newValue).replace(/,/g, "")) || 0;
    const startStr = `${year}-${String(month + 1).padStart(2, "0")}-10`;

    const { data: existing, error: selectErr } = await supabase
      .from("monthly_summary")
      .select("*")
      .eq("user_id", authId)
      .eq("month", startStr)
      .maybeSingle();

    if (selectErr) console.error("❌ Select error:", selectErr);

    if (existing) {
      const { error: updateErr } = await supabase
        .from("monthly_summary")
        .update({ salary_amount: numValue })
        .eq("id", existing.id);
      if (updateErr) console.error(updateErr);
    } else {
      const { error: insertErr } = await supabase
        .from("monthly_summary")
        .insert([
          { user_id: authId, month: startStr, salary_amount: numValue },
        ]);
      if (insertErr) console.error(insertErr);
    }

    await fetchAll();
  };

  const handleSalaryChange = (e) => {
    const raw = e.target.value.replace(/,/g, "");
    setSalary(raw);
    autoResizeSalaryInput(formatSalaryDisplay(raw));
  };
  const handleSalaryBlur = async (e) => {
    const raw = e.target.value.replace(/,/g, "");
    await saveSalary(raw);
  };
  const autoResizeSalaryInput = (text) => {
    if (!mirrorRef.current || !salaryRef.current) return;
    mirrorRef.current.textContent = text || "0";
    salaryRef.current.style.width = mirrorRef.current.offsetWidth + 10 + "px";
  };
  useEffect(() => {
    autoResizeSalaryInput(formatSalaryDisplay(salary));
  }, [salary]);

  // ---------- Transactions ----------
  const handleAdd = async () => {
    if (!authId) return;
    const fakeDay = new Date(year, month, 15).toISOString();
    const newTx = {
      user_id: authId,
      type: "expense",
      category: "",
      budget: 0,
      spent: 0,
      description: "",
      payment: 1,
      created_at: fakeDay,
    };
    const { data, error } = await supabase
      .from("transactions")
      .insert([newTx])
      .select()
      .single();

    if (error) console.error("❌ Add transaction failed:", error.message);
    else setTransactions((prev) => [...prev, data]);
  };

  const handleDelete = async (txid) => {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .or(`id.eq.${txid},parent_id.eq.${txid}`);
    if (error) console.error("❌ Delete failed:", error.message);
    else fetchAll();
  };

  const handleChange = (id, field, value) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleBlur = async (id, field, value, row) => {
    if (isNonOriginal(row)) return;

    if (["category", "description"].includes(field)) {
      await supabase
        .from("transactions")
        .update({ [field]: value })
        .or(`id.eq.${id},parent_id.eq.${id}`);
      fetchAll();
      return;
    }

    if (field === "spent") {
      const spent = value === "" || value === null ? 0 : Number(value);
      const { error } = await supabase
        .from("transactions")
        .update({ spent })
        .eq("id", id);
      if (error) console.error("❌ Spent update failed:", error.message);
      else fetchAll();
      return;
    }

    if (field === "budget") {
      const budget = Number(value) || 0;
      const spent = Math.round(budget / (row.payment || 1));
      await supabase
        .from("transactions")
        .update({ budget, spent })
        .eq("id", id);
      await supabase.from("transactions").update({ spent }).eq("parent_id", id);
      fetchAll();
      return;
    }

    if (field === "payment") {
      const payments = Math.max(1, Math.floor(Number(value) || 1));
      if (!row.budget || payments < 1) {
        alert("Set a budget before specifying payments.");
        return;
      }
      const spent = Math.round(row.budget / payments);
      await supabase
        .from("transactions")
        .update({
          payment: payments,
          spent,
          total_installments: payments,
          installment_index: 1,
          parent_id: null,
        })
        .eq("id", id);
      await supabase.from("transactions").delete().eq("parent_id", id);

      if (payments > 1) {
        const newTxs = [];
        for (let i = 2; i <= payments; i++) {
          const nextDate = new Date(row.created_at);
          nextDate.setMonth(nextDate.getMonth() + (i - 1));
          newTxs.push({
            user_id: row.user_id,
            type: row.type,
            category: row.category,
            budget: row.budget,
            spent,
            payment: payments - (i - 1),
            parent_id: id,
            installment_index: i,
            total_installments: payments,
            description: row.description,
            created_at: nextDate.toISOString(),
          });
        }
        await supabase.from("transactions").insert(newTxs);
      }
      fetchAll();
      return;
    }
  };

  const handleTypeToggle = async (t) => {
    const isParentWithInstallments = !t.parent_id && t.total_installments > 1;
    const isChildInstallment = !!t.parent_id;
    const isSimpleTransaction =
      !isParentWithInstallments &&
      !isChildInstallment &&
      (t.payment ?? 1) === 1;

    if (!isSimpleTransaction) return;

    const newType = t.type === "expense" ? "income" : "expense";
    const { error } = await supabase
      .from("transactions")
      .update({ type: newType })
      .eq("id", t.id);
    if (error) {
      console.error("❌ Type toggle failed:", error.message);
      return;
    }
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === t.id ? { ...tx, type: newType } : tx))
    );
  };

  // ---------- Totals ----------
  const totalSpent = transactions.reduce((sum, t) => {
    const spent = Number(t.spent || 0);
    return t.type === "income" ? sum - spent : sum + spent;
  }, 0);
  const totalBudget = transactions.reduce((sum, t) => {
    if (t.type === "income") return sum;
    const isInstallmentParent =
      !t.parent_id && (t.payment > 1 || t.total_installments > 1);
    const isChild = t.parent_id !== null;
    const value =
      isInstallmentParent || isChild
        ? Number(t.spent || 0)
        : Number(t.budget || 0);
    return sum + value;
  }, 0);

  const diffExpected = Number(salary || 0) - totalBudget;
  const diffActual = Number(salary || 0) - totalSpent;
  const diffColorExpected = diffExpected >= 0 ? "#22c55e" : "#ef4444";
  const diffColorActual = diffActual >= 0 ? "#22c55e" : "#ef4444";

  // ---------- Render ----------
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <button className="nav-arrow" onClick={goToPreviousMonth}>
          ‹
        </button>

        <div className="month-title">
          <div>
            {monthNames[month]} {year}
          </div>
          <div className="month-range">
            {formatDate(start)} – {formatDate(end)}
            <span
              className="calendar-icon"
              onClick={() => {
                setTempMonth(month);
                setTempYear(year);
                setPickerOpen(!pickerOpen);
              }}
            >
              📅
            </span>
            {pickerOpen && (
              <div className="month-picker-dropdown">
                <select
                  value={tempMonth}
                  onChange={(e) => setTempMonth(Number(e.target.value))}
                >
                  {monthNames.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={tempYear}
                  onChange={(e) => setTempYear(Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(
                    (y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    )
                  )}
                </select>
                <button
                  className="apply-btn"
                  onClick={() => {
                    setYear(tempYear);
                    setMonth(tempMonth);
                    setPickerOpen(false);
                  }}
                >
                  Go
                </button>
              </div>
            )}
          </div>

          <div className="salary-line">
            Salary:
            <span className="salary-wrapper">
              <input
                ref={salaryRef}
                type="text"
                className="salary-input dynamic"
                value={formatSalaryDisplay(salary)}
                onChange={handleSalaryChange}
                onBlur={handleSalaryBlur}
                onFocus={(e) => e.target.select()}
              />
              &nbsp;₪<span ref={mirrorRef} className="salary-mirror"></span>
            </span>
          </div>
        </div>

        <button className="nav-arrow" onClick={goToNextMonth}>
          ›
        </button>
      </div>

      <div className="dashboard-panel wide">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="budget-table-wrapper">
            <table className="budget-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Spent</th>
                  <th>Budget</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Description</th>
                  <th>
                    <button className="add-row small" onClick={handleAdd}>
                      ＋
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        className="editable"
                        value={t.category || ""}
                        onChange={(e) =>
                          handleChange(t.id, "category", e.target.value)
                        }
                        onBlur={(e) =>
                          handleBlur(t.id, "category", e.target.value, t)
                        }
                        disabled={isNonOriginal(t)}
                      />
                      {t.total_installments > 1 && (
                        <span className="installment-tag">
                          [{t.installment_index}/{t.total_installments}]
                        </span>
                      )}
                    </td>
                    <td style={{ color: diffColorActual }}>
                      <input
                        type="number"
                        className="editable"
                        value={t.spent ?? ""}
                        onChange={(e) =>
                          handleChange(t.id, "spent", e.target.value)
                        }
                        onBlur={(e) =>
                          handleBlur(t.id, "spent", e.target.value, t)
                        }
                        disabled={t.payment > 1 || t.parent_id !== null}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="editable"
                        value={t.budget || ""}
                        onChange={(e) =>
                          handleChange(t.id, "budget", e.target.value)
                        }
                        onBlur={(e) =>
                          handleBlur(t.id, "budget", e.target.value, t)
                        }
                        disabled={isNonOriginal(t)}
                      />
                    </td>
                    <td>
                      <span
                        className={`type-label small ${t.type}`}
                        onClick={() => handleTypeToggle(t)}
                        style={{
                          cursor:
                            t.parent_id || t.total_installments > 1
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            t.parent_id || t.total_installments > 1 ? 0.6 : 1,
                        }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="editable"
                        value={t.payment || ""}
                        onChange={(e) =>
                          handleChange(t.id, "payment", e.target.value)
                        }
                        onBlur={(e) =>
                          handleBlur(t.id, "payment", e.target.value, t)
                        }
                        disabled={isNonOriginal(t)}
                      />
                    </td>
                    <td>
                      <input
                        className="editable"
                        value={t.description || ""}
                        onChange={(e) =>
                          handleChange(t.id, "description", e.target.value)
                        }
                        onBlur={(e) =>
                          handleBlur(t.id, "description", e.target.value, t)
                        }
                        disabled={isNonOriginal(t)}
                      />
                    </td>
                    <td>
                      {!isNonOriginal(t) && (
                        <button
                          className="delete-row"
                          onClick={() => handleDelete(t.id)}
                        >
                          X
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>
                    <b>Total</b>
                  </td>
                  <td>
                    <b>{totalSpent.toLocaleString()}₪</b>
                  </td>
                  <td>
                    <b>{totalBudget.toLocaleString()}₪</b>
                  </td>
                  <td colSpan="3" style={{ textAlign: "right" }}>
                    <span style={{ color: "var(--text)" }}>Expected: </span>
                    <span style={{ color: diffColorExpected }}>
                      {diffExpected >= 0
                        ? `${diffExpected.toLocaleString()}₪`
                        : `- ${Math.abs(diffExpected).toLocaleString()}₪`}
                    </span>
                    <span style={{ color: "#374469ff" }}> | </span>
                    <span style={{ color: "var(--text)" }}>Actual: </span>
                    <span style={{ color: diffColorActual }}>
                      {diffActual >= 0
                        ? `${diffActual.toLocaleString()}₪`
                        : `- ${Math.abs(diffActual).toLocaleString()}₪`}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {/* <button className="add-row" onClick={handleAdd}>
          + Add Transaction
        </button> */}
      </div>
    </div>
  );
}
