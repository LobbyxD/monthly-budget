// src/pages/UserDashboard.tsx
import { useEffect, useState, useMemo, useRef, ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../style/global.css";
import "../style/userdashboard.css";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";

/** ---------- Types ---------- */
interface Transaction {
  id: number;
  user_id: string;
  type: "expense" | "income";
  category: string | null;
  budget: number | null;
  spent: number | null;
  description: string | null;
  payment: number;
  parent_id: number | null;
  installment_index: number | null;
  total_installments: number | null;
  created_at: string;
  display_order: number | null;
}

interface MonthlySummary {
  id?: number;
  user_id: string;
  month: string;
  salary_amount: number;
}

type RouteParams = {
  public_id?: string;
};

/** ---------- Component ---------- */
export default function UserDashboard() {
  const { public_id } = useParams<RouteParams>();
  const { user } = useAuth();

  // 🔹 Core state
  const [authId, setAuthId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [salary, setSalary] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 🔹 Month and date helpers
  const now = new Date();
  const currentMonth = now.getDate() < 10 ? now.getMonth() - 1 : now.getMonth();
  const currentYear =
    now.getDate() < 10 && now.getMonth() === 0
      ? now.getFullYear() - 1
      : now.getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(
    currentMonth < 0 ? 11 : currentMonth
  );
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [tempMonth, setTempMonth] = useState<number>(month);
  const [tempYear, setTempYear] = useState<number>(year);

  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const salaryRef = useRef<HTMLInputElement | null>(null);

  const [viewedUserName, setViewedUserName] = useState<string | null>(null);

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

  /** ---------- Helpers ---------- */
  const isNonOriginal = (t: Transaction) => t.parent_id !== null;

  const getBudgetRange = (m: number, y: number) => {
    const start = new Date(y, m, 10);
    const end = new Date(y, m + 1, 9);
    return { start, end };
  };

  const { start, end } = useMemo(
    () => getBudgetRange(month, year),
    [month, year]
  );

  const toIso = (d: Date) => d.toISOString().split("T")[0];
  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;

  const formatSalaryDisplay = (val: string | number | null) => {
    if (val === "" || val === null || isNaN(Number(val))) return "";
    return Number(val).toLocaleString();
  };

  /** ---------- Ordering helpers (fractional ordering) ---------- */
  function getNewOrder(before?: number | null, after?: number | null): number {
    if (before == null && after == null) return 1; // empty list
    if (before == null && after != null) return after - 1; // insert at top
    if (after == null && before != null) return before + 1; // insert at bottom
    // insert between
    return ((before as number) + (after as number)) / 2;
  }

  /** Get the next order at the bottom for the current month scope */
  async function getNextDisplayOrderForMonth(
    authId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const { data, error } = await supabase
      .from("transactions")
      .select("display_order")
      .eq("user_id", authId)
      .gte("created_at", toIso(start))
      .lte("created_at", toIso(end))
      .order("display_order", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) {
      console.error("❌ getNextDisplayOrderForMonth error:", error.message);
      return 1;
    }
    const maxVal = data?.[0]?.display_order ?? 0;
    return Number(maxVal) + 1;
  }

  /** Persist a new display order for a single row */
  async function persistDisplayOrder(id: number, newOrder: number) {
    const { error } = await supabase
      .from("transactions")
      .update({ display_order: newOrder })
      .eq("id", id);

    if (error) throw error;
  }

  /** ---------- Resolve which user ---------- */
  useEffect(() => {
    const resolveUser = async () => {
      if (public_id) {
        const { data, error } = await supabase
          .from("users")
          .select("auth_id, firstName, lastName")
          .eq("public_id", public_id)
          .maybeSingle();

        if (error) {
          console.error("❌ Failed to find user by public_id:", error.message);
        } else if (data?.auth_id) {
          setAuthId(data.auth_id);
          const fullName = [data.firstName, data.lastName]
            .filter(Boolean)
            .join(" ");
          setViewedUserName(fullName || "Unnamed User");
        } else {
          console.warn("⚠️ No user found for public_id:", public_id);
          setAuthId(null);
          setViewedUserName(null);
        }
      } else {
        setAuthId(user?.id || null);
        setViewedUserName(null); // viewing self
      }
    };
    resolveUser();
  }, [public_id, user?.id]);

  /** ---------- Fetch all data ---------- */
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
        .maybeSingle<MonthlySummary>();

      setSalary(summary?.salary_amount?.toString() ?? "");

      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", authId)
        .gte("created_at", toIso(start))
        .lte("created_at", toIso(end))
        .order("display_order", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true }); // tie-breaker

      setTransactions((txs as Transaction[]) || []);
    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [authId, month, year]);

  /** ---------- Month Navigation ---------- */
  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset, 1);
    setYear(newDate.getFullYear());
    setMonth(newDate.getMonth());
  };
  const goToPreviousMonth = () => changeMonth(-1);
  const goToNextMonth = () => changeMonth(1);

  /** ---------- Salary ---------- */
  const saveSalary = async (newValue: string | number) => {
    if (!authId) return;
    const numValue = Number(String(newValue).replace(/,/g, "")) || 0;
    const startStr = `${year}-${String(month + 1).padStart(2, "0")}-10`;

    const { data: existing, error: selectErr } = await supabase
      .from("monthly_summary")
      .select("*")
      .eq("user_id", authId)
      .eq("month", startStr)
      .maybeSingle<MonthlySummary>();

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

    setSalary(numValue.toString());
  };

  const autoResizeSalaryInput = (text: string) => {
    if (!mirrorRef.current || !salaryRef.current) return;
    mirrorRef.current.textContent = text || "0";
    salaryRef.current.style.width = mirrorRef.current.offsetWidth + 10 + "px";
  };

  const handleSalaryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    setSalary(raw);
    autoResizeSalaryInput(formatSalaryDisplay(raw));
  };

  const handleSalaryBlur = async (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    await saveSalary(raw);
  };

  useEffect(() => {
    autoResizeSalaryInput(formatSalaryDisplay(salary));
  }, [salary]);

  /** ---------- Transactions ---------- */
  const handleAdd = async () => {
    if (!authId) return;
    const fakeDay = new Date(year, month, 15).toISOString();

    const nextOrder = await getNextDisplayOrderForMonth(authId, start, end);

    const newTx: Omit<Transaction, "id"> = {
      user_id: authId,
      type: "expense",
      category: "",
      budget: 0,
      spent: null,
      description: "",
      payment: 1,
      created_at: fakeDay,
      parent_id: null,
      installment_index: null,
      total_installments: null,
      display_order: nextOrder, // 👈 NEW
    };
    const { data, error } = await supabase
      .from("transactions")
      .insert([newTx])
      .select()
      .single<Transaction>();

    if (error) console.error("❌ Add transaction failed:", error.message);
    else setTransactions((prev) => [...prev, data]);
  };

  const handleDelete = async (txid: number) => {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .or(`id.eq.${txid},parent_id.eq.${txid}`);
    if (error) console.error("❌ Delete failed:", error.message);
    else
      setTransactions((prev) =>
        prev.filter((t) => t.id !== txid && t.parent_id !== txid)
      );
  };

  const handleChange = (id: number, field: keyof Transaction, value: any) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleBlur = async (
    id: number,
    field: keyof Transaction,
    value: any,
    row: Transaction
  ) => {
    if (isNonOriginal(row)) return;

    if (["category", "description"].includes(field)) {
      await supabase
        .from("transactions")
        .update({ [field]: value })
        .or(`id.eq.${id},parent_id.eq.${id}`);

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id || t.parent_id === id ? { ...t, [field]: value } : t
        )
      );
      return;
    }

    if (field === "spent") {
      const spent = value === "" || value === null ? 0 : Number(value);
      const { error } = await supabase
        .from("transactions")
        .update({ spent })
        .eq("id", id);
      if (error) console.error("❌ Spent update failed:", error.message);
      else
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, spent } : t))
        );
      return;
    }

    if (field === "budget") {
      const budget = Number(value) || 0;
      let spent = row.spent || null;
      if ((row.payment || 1) > 1)
        spent = Math.round(budget / (row.payment || 1));

      await supabase
        .from("transactions")
        .update({ budget, spent })
        .eq("id", id);
      if ((row.payment || 1) > 1)
        await supabase
          .from("transactions")
          .update({ spent })
          .eq("parent_id", id);

      setTransactions((prev) =>
        prev.map((t) => {
          if (t.id === id) return { ...t, budget, spent };
          if (t.parent_id === id) return { ...t, spent };
          return t;
        })
      );
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

      const newTxs: Transaction[] = [];
      if (payments > 1) {
        for (let i = 2; i <= payments; i++) {
          const nextDate = new Date(row.created_at);
          nextDate.setMonth(nextDate.getMonth() + (i - 1));
          newTxs.push({
            ...row,
            id: 0,
            parent_id: id,
            installment_index: i,
            total_installments: payments,
            payment: payments - (i - 1),
            spent,
            created_at: nextDate.toISOString(),
          });
        }
        await supabase.from("transactions").insert(newTxs);
      }

      setTransactions((prev) => {
        const filtered = prev.filter((t) => t.id !== id && t.parent_id !== id);
        return [...filtered, ...newTxs, { ...row, payment: payments, spent }];
      });
    }
  };

  const handleTypeToggle = async (t: Transaction) => {
    const isParentWithInstallments =
      !t.parent_id && (t.total_installments ?? 0) > 1;
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
    if (error) return console.error("❌ Type toggle failed:", error.message);

    setTransactions((prev) =>
      prev.map((tx) => (tx.id === t.id ? { ...tx, type: newType } : tx))
    );
  };

  /** ---------- Drag End Handler ---------- */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return; // same place or dropped outside

    const oldIndex = transactions.findIndex((t) => t.id === active.id);
    const newIndex = transactions.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(transactions, oldIndex, newIndex);
    setTransactions(newItems);

    // compute new fractional order using your helper
    const before = newIndex > 0 ? newItems[newIndex - 1]?.display_order : null;
    const after =
      newIndex < newItems.length - 1
        ? newItems[newIndex + 1]?.display_order
        : null;
    const newOrder = getNewOrder(before, after);

    try {
      await persistDisplayOrder(active.id as number, newOrder);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, display_order: newOrder } : t
        )
      );
    } catch (err: any) {
      console.error("❌ Failed to persist new order:", err.message);
      // revert UI if update fails
      setTransactions(transactions);
    }
  };

  /** ---------- Totals ---------- */
  const totalSpent = transactions.reduce((sum, t) => {
    const spent = Number(t.spent || 0);
    return t.type === "income" ? sum - spent : sum + spent;
  }, 0);

  const totalBudget = transactions.reduce((sum, t) => {
    if (t.type === "income") return sum;
    const isInstallmentParent =
      !t.parent_id && (t.payment > 1 || (t.total_installments ?? 0) > 1);
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

  const getSpentColor = (t: Transaction) => {
    const spent = Number(t.spent || 0);
    const budget = Number(t.budget || 0);
    if (spent === 0) return "var(--text)";
    if (spent < budget) return "#22C55E";
    if (spent === budget) return "#FBBF24";
    if (spent > budget) return "#EF4444";
    return "var(--text)";
  };

  /** ---------- Reorder ---------- */
  async function moveRowByIndex(sourceIndex: number, destIndex: number) {
    setTransactions((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(sourceIndex, 1);
      arr.splice(destIndex, 0, moved);
      return arr;
    });

    // compute new display_order based on neighbors in the *new* array
    const current = (idx: number) => transactions[idx];
    const before =
      destIndex > 0 ? transactions[destIndex - 1]?.display_order : null;
    const after =
      destIndex < transactions.length
        ? transactions[destIndex]?.display_order
        : null;

    const newOrder = getNewOrder(before, after);

    try {
      await persistDisplayOrder(transactions[sourceIndex].id, newOrder);
      // also reflect it in local state to avoid refetch:
      setTransactions((prev) =>
        prev.map((t, i) =>
          i === destIndex ? { ...t, display_order: newOrder } : t
        )
      );
    } catch (e: any) {
      console.error("❌ Failed to persist new order:", e?.message);
      // Optional: revert UI if you want
      fetchAll();
    }
  }

  /** ---------- Sortable Row Component ---------- */
  interface SortableRowProps {
    transaction: Transaction;
    index: number;
    onDelete: (id: number) => void;
    onChange: (id: number, field: keyof Transaction, value: any) => void;
    onBlur: (
      id: number,
      field: keyof Transaction,
      value: any,
      row: Transaction
    ) => void;
    onTypeToggle: (t: Transaction) => void;
    isNonOriginal: (t: Transaction) => boolean;
    getSpentColor: (t: Transaction) => string;
  }

  function SortableRow({
    transaction: t,
    index,
    onDelete,
    onChange,
    onBlur,
    onTypeToggle,
    isNonOriginal,
    getSpentColor,
  }: SortableRowProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: t.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      background: isDragging ? "var(--hover-row)" : undefined,
    };

    /** ---------- DnD Sensors ---------- */
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: { distance: 5 }, // require small drag motion before activation
      })
    );

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className="draggable-row"
        {...attributes}
      >
        {/* Drag handle cell */}
        <td className="drag-cell" {...listeners}>
          <GripVertical className="drag-icon" size={18} />
        </td>

        {/* Category */}
        <td>
          <input
            className="editable"
            value={t.category || ""}
            onChange={(e) => onChange(t.id, "category", e.target.value)}
            onBlur={(e) => onBlur(t.id, "category", e.target.value, t)}
            disabled={isNonOriginal(t)}
          />
          {t.total_installments && t.total_installments > 1 && (
            <span className="installment-tag">
              [{t.installment_index}/{t.total_installments}]
            </span>
          )}
        </td>

        {/* Spent */}
        <td style={{ color: getSpentColor(t) }}>
          <input
            type="number"
            className="editable"
            value={t.spent ?? ""}
            onChange={(e) => onChange(t.id, "spent", e.target.value)}
            onBlur={(e) => onBlur(t.id, "spent", e.target.value, t)}
            disabled={(t.payment ?? 1) > 1 || t.parent_id !== null}
          />
        </td>

        {/* Budget */}
        <td>
          <input
            type="number"
            className="editable"
            value={t.budget ?? ""}
            onChange={(e) => onChange(t.id, "budget", e.target.value)}
            onBlur={(e) => onBlur(t.id, "budget", e.target.value, t)}
            disabled={isNonOriginal(t)}
          />
        </td>

        {/* Type */}
        <td>
          <span
            className={`type-label small ${t.type}`}
            onClick={() => onTypeToggle(t)}
            style={{
              cursor:
                t.parent_id || (t.total_installments ?? 0) > 1
                  ? "not-allowed"
                  : "pointer",
              opacity: t.parent_id || (t.total_installments ?? 0) > 1 ? 0.6 : 1,
            }}
          >
            {t.type}
          </span>
        </td>

        {/* Payment */}
        <td>
          <input
            type="number"
            className="editable"
            value={t.payment ?? ""}
            onChange={(e) => onChange(t.id, "payment", e.target.value)}
            onBlur={(e) => onBlur(t.id, "payment", e.target.value, t)}
            disabled={isNonOriginal(t)}
          />
        </td>

        {/* Description */}
        <td>
          <input
            className="editable"
            value={t.description || ""}
            onChange={(e) => onChange(t.id, "description", e.target.value)}
            onBlur={(e) => onBlur(t.id, "description", e.target.value, t)}
            disabled={isNonOriginal(t)}
          />
        </td>

        {/* Delete */}
        <td>
          {!isNonOriginal(t) && (
            <button className="delete-row" onClick={() => onDelete(t.id)}>
              X
            </button>
          )}
        </td>
      </tr>
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // requires slight movement before drag starts
    })
  );

  /** ---------- Render ---------- */
  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <button className="nav-arrow" onClick={goToPreviousMonth}>
          ‹
        </button>
        <div className="month-title">
          <div>
            {monthNames[month]} {year}
          </div>
          {viewedUserName && user?.id !== authId && (
            <div className="viewed-user-line">
              Viewing: <strong>{viewedUserName}</strong>
            </div>
          )}

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

      {/* Body */}
      <div className="dashboard-panel wide">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="budget-table-wrapper">
            <table className="budget-table">
              <colgroup>
                <col style={{ width: "3%" }} />{" "}
                {/* 👈 new drag handle column */}
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th></th> {/* reorder */}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
              >
                <SortableContext
                  items={transactions.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {transactions.map((t, index) => (
                      <SortableRow
                        key={t.id}
                        transaction={t}
                        index={index}
                        onDelete={handleDelete}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onTypeToggle={handleTypeToggle}
                        isNonOriginal={isNonOriginal}
                        getSpentColor={getSpentColor}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>

              <tfoot>
                <tr className="total-row">
                  <td></td> {/*reorder*/}
                  <td>
                    <b>Total</b>
                  </td>
                  <td>
                    <b>{totalSpent.toLocaleString()}₪</b>
                  </td>
                  <td>
                    <b>{totalBudget.toLocaleString()}₪</b>
                  </td>
                  <td colSpan={3} style={{ textAlign: "right" }}>
                    <span style={{ color: "var(--text)" }}>Current: </span>
                    <span style={{ color: diffColorActual }}>
                      {diffActual >= 0
                        ? `${diffActual.toLocaleString()}₪`
                        : `- ${Math.abs(diffActual).toLocaleString()}₪`}
                    </span>
                    <span style={{ color: "#374469ff" }}>
                      &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                    </span>
                    <span style={{ color: "var(--text)" }}>Expected: </span>
                    <span style={{ color: diffColorExpected }}>
                      {diffExpected >= 0
                        ? `${diffExpected.toLocaleString()}₪`
                        : `- ${Math.abs(diffExpected).toLocaleString()}₪`}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
