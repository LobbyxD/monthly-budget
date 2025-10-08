import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../style/global.css";
import "../style/userdashboard.css";

export default function UserDashboard() {
  const { id } = useParams();
  const now = new Date();

  // 🔹 Month logic (10th–9th)
  const currentMonth = now.getDate() < 10 ? now.getMonth() - 1 : now.getMonth();
  const currentYear =
    now.getDate() < 10 && now.getMonth() === 0
      ? now.getFullYear() - 1
      : now.getFullYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth < 0 ? 11 : currentMonth);
  const [salary, setSalary] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const mirrorRef = useRef(null);
  const salaryRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempMonth, setTempMonth] = useState(month);
  const [tempYear, setTempYear] = useState(year);

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

  /** ---------- Helpers ---------- **/
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

  /** ---------- Fetch Data ---------- **/
  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const uid = Number(id);
      const { data: summary } = await supabase
        .from("monthly_summary")
        .select("salary_amount")
        .eq("user_id", uid)
        .gte("month", toIso(new Date(year, month, 1)))
        .lt("month", toIso(new Date(year, month + 1, 1)))
        .maybeSingle();

      setSalary(summary?.salary_amount ?? "");

      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
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
  }, [id, month, year]);

  /** ---------- Month Navigation ---------- **/
  const changeMonth = (offset) => {
    const newDate = new Date(year, month + offset, 1);
    setYear(newDate.getFullYear());
    setMonth(newDate.getMonth());
  };

  const goToPreviousMonth = () => changeMonth(-1);
  const goToNextMonth = () => changeMonth(1);

  /** ---------- Salary ---------- **/
  const saveSalary = async (newValue) => {
    const uid = Number(id);
    const numValue = Number(String(newValue).replace(/,/g, "")) || 0;
    const startStr = `${year}-${String(month + 1).padStart(2, "0")}-10`;

    console.log("💾 Attempting to save salary:");
    console.log({ uid, startStr, numValue });

    const { data: existing, error: selectErr } = await supabase
      .from("monthly_summary")
      .select("*")
      .eq("user_id", uid)
      .eq("month", startStr)
      .maybeSingle();

    if (selectErr) console.error("❌ Select error:", selectErr);
    console.log("Existing record:", existing);

    if (existing) {
      const { error: updateErr } = await supabase
        .from("monthly_summary")
        .update({ salary_amount: numValue })
        .eq("id", existing.id);
      console.log("🔁 Update result:", updateErr || "OK");
    } else {
      const { error: insertErr, data: insertData } = await supabase
        .from("monthly_summary")
        .insert([{ user_id: uid, month: startStr, salary_amount: numValue }])
        .select();
      console.log("➕ Insert result:", insertErr || insertData);
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

  /** ---------- Transactions ---------- **/
  const handleAdd = async () => {
    const uid = Number(id);
    const fakeDay = new Date(year, month, 15).toISOString();

    const newTx = {
      user_id: uid,
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

    if (error)
      return console.error("❌ Add transaction failed:", error.message);
    setTransactions((prev) => [...prev, data]);
  };

  const handleDelete = async (txid) => {
    // Delete original and its installments
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

    // 🔸 Category / Description update → propagate to installments
    if (field === "category" || field === "description") {
      await supabase
        .from("transactions")
        .update({ [field]: value })
        .or(`id.eq.${id},parent_id.eq.${id}`);
      fetchAll();
      return;
    }

    // 🔸 Spent update → save directly (only for editable rows)
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

    // 🔸 Budget update → adjust spent = budget/payment (rounded)
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

    // 🔸 Payment update → recreate installments
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

      // Remove old installments
      await supabase.from("transactions").delete().eq("parent_id", id);

      // Create new installments
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
    // Only allow toggling for simple (non-installment) transactions
    const isParentWithInstallments = !t.parent_id && t.total_installments > 1;
    const isChildInstallment = !!t.parent_id;
    const isSimpleTransaction =
      !isParentWithInstallments &&
      !isChildInstallment &&
      (t.payment ?? 1) === 1;

    if (!isSimpleTransaction) {
      console.warn("Type toggle blocked: installments or linked transactions");
      return;
    }

    const newType = t.type === "expense" ? "income" : "expense";

    const { error } = await supabase
      .from("transactions")
      .update({ type: newType })
      .eq("id", t.id);

    if (error) {
      console.error("❌ Type toggle failed:", error.message);
      return;
    }

    // Update UI
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === t.id ? { ...tx, type: newType } : tx))
    );
  };

  /** ---------- Totals ---------- **/
  const totalSpent = transactions.reduce((sum, t) => {
    const spent = Number(t.spent || 0);
    return t.type === "income" ? sum - spent : sum + spent;
  }, 0);

  const totalBudget = transactions.reduce((sum, t) => {
    // Skip income rows entirely
    if (t.type === "income") return sum;

    // If it's an installment parent or a non-original child, use spent instead of budget
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
  const getColorByRatio = (spent, budget) => {
    if (budget === 0 || !budget) return "var(--text)";
    const ratio = spent / budget;
    if (ratio > 1) return "#ef4444";
    if (ratio > 0.8) return "#facc15";
    return "#22c55e";
  };

  const getCellClass = (t, field) => {
    // non-original → no hover
    if (isNonOriginal(t)) return "no-hover";

    // original → disable hover for spent field
    if (!t.parent_id && field === "spent") return "no-hover";

    // otherwise editable
    return "";
  };

  /** ---------- Render ---------- **/
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
              <colgroup>
                <col style={{ width: "16%" }} /> {/* Category */}
                <col style={{ width: "10%" }} /> {/* Spent */}
                <col style={{ width: "10%" }} /> {/* Budget */}
                <col style={{ width: "9%" }} /> {/* Type */}
                <col style={{ width: "10%" }} /> {/* Payment */}
                <col style={{ width: "35%" }} /> {/* Description */}
                <col style={{ width: "10%" }} /> {/* Delete / extra */}
              </colgroup>

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
                    <td style={{ color: getColorByRatio(t.spent, t.budget) }}>
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
                        title={
                          t.parent_id
                            ? "Type locked for installment"
                            : t.total_installments > 1
                            ? "Type locked for parent transaction with installments"
                            : "Click to toggle type"
                        }
                        onClick={() => {
                          const isParentWithInstallments =
                            !t.parent_id && t.total_installments > 1;
                          const isChildInstallment = !!t.parent_id;
                          const isSimpleTransaction =
                            !isParentWithInstallments &&
                            !isChildInstallment &&
                            (t.payment ?? 1) === 1;

                          if (!isSimpleTransaction) return; // prevent click
                          handleTypeToggle(t);
                        }}
                        style={{
                          cursor:
                            t.parent_id || t.total_installments > 1
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            t.parent_id || t.total_installments > 1 ? 0.6 : 1,
                          userSelect: "none",
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
