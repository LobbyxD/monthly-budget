// src/pages/UserDashboard.tsx
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  ChangeEvent,
  useCallback,
  memo,
} from "react";
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
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";

/* ---------- Types ---------- */
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

type RouteParams = { public_id?: string };

/* ---------- Sortable Row ---------- */
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

const SortableRow = memo(function SortableRow({
  transaction: t,
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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="draggable-row"
      {...attributes}
    >
      <td className="drag-cell" {...listeners}>
        <GripVertical className="drag-icon" size={18} />
      </td>

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

      <td>
        <input
          className="editable"
          value={t.description || ""}
          onChange={(e) => onChange(t.id, "description", e.target.value)}
          onBlur={(e) => onBlur(t.id, "description", e.target.value, t)}
          disabled={isNonOriginal(t)}
        />
      </td>

      <td>
        {!isNonOriginal(t) && (
          <button className="delete-row" onClick={() => onDelete(t.id)}>
            X
          </button>
        )}
      </td>
    </tr>
  );
});

/* ---------- Transactions Table (fixed DnD context) ---------- */
const TransactionsTable = memo(function TransactionsTable({
  transactions,
  onChange,
  onBlur,
  onDelete,
  onTypeToggle,
  isNonOriginal,
  getSpentColor,
  handleDragEnd,
}: {
  transactions: Transaction[];
  onChange: (id: number, field: keyof Transaction, value: any) => void;
  onBlur: (
    id: number,
    field: keyof Transaction,
    value: any,
    row: Transaction
  ) => void;
  onDelete: (id: number) => void;
  onTypeToggle: (t: Transaction) => void;
  isNonOriginal: (t: Transaction) => boolean;
  getSpentColor: (t: Transaction) => string;
  handleDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  return (
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
              key={`tx-${t.id}`}
              transaction={t}
              index={index}
              onDelete={onDelete}
              onChange={onChange}
              onBlur={onBlur}
              onTypeToggle={onTypeToggle}
              isNonOriginal={isNonOriginal}
              getSpentColor={getSpentColor}
            />
          ))}
        </tbody>
      </SortableContext>
    </DndContext>
  );
});

/* ---------- Main Component ---------- */
export default function UserDashboard() {
  const { public_id } = useParams<RouteParams>();
  const { user } = useAuth();

  const [authId, setAuthId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState("");
  const [viewedUserName, setViewedUserName] = useState<string | null>(null);

  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const salaryRef = useRef<HTMLInputElement | null>(null);

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

  /* Helpers */
  const getBudgetRange = useCallback((m: number, y: number) => {
    const start = new Date(y, m, 10);
    const end = new Date(y, m + 1, 9);
    return { start, end };
  }, []);
  const { start, end } = useMemo(
    () => getBudgetRange(month, year),
    [month, year, getBudgetRange]
  );
  const toIso = (d: Date) => d.toISOString().split("T")[0];
  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
  const isNonOriginal = useCallback(
    (t: Transaction) => t.parent_id !== null,
    []
  );
  const getSpentColor = useCallback((t: Transaction) => {
    const spent = Number(t.spent || 0);
    const budget = Number(t.budget || 0);
    if (spent === 0) return "var(--text)";
    if (spent < budget) return "#22C55E";
    if (spent === budget) return "#FBBF24";
    return "#EF4444";
  }, []);

  /* Fetch */
  useEffect(() => {
    (async () => {
      if (public_id) {
        const { data } = await supabase
          .from("users")
          .select("auth_id, firstName, lastName")
          .eq("public_id", public_id)
          .maybeSingle();
        if (data?.auth_id) {
          setAuthId(data.auth_id);
          setViewedUserName(
            [data.firstName, data.lastName].filter(Boolean).join(" ")
          );
        }
      } else {
        setAuthId(user?.id || null);
      }
    })();
  }, [public_id, user?.id]);

  const fetchAll = useCallback(async () => {
    if (!authId) return;
    setLoading(true);
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", authId)
      .gte("created_at", toIso(start))
      .lte("created_at", toIso(end))
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });
    setTransactions((txs as Transaction[]) || []);
    setLoading(false);
  }, [authId, start, end]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Handlers */
  const handleChange = useCallback(
    (id: number, field: keyof Transaction, value: any) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  const handleBlur = useCallback(
    async (id: number, field: keyof Transaction, value: any) => {
      await supabase
        .from("transactions")
        .update({ [field]: value })
        .eq("id", id);
    },
    []
  );

  const handleDelete = useCallback(async (id: number) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleTypeToggle = useCallback(async (t: Transaction) => {
    const newType = t.type === "expense" ? "income" : "expense";
    await supabase
      .from("transactions")
      .update({ type: newType })
      .eq("id", t.id);
    setTransactions((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, type: newType } : x))
    );
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = transactions.findIndex((t) => t.id === active.id);
      const newIndex = transactions.findIndex((t) => t.id === over.id);
      setTransactions(arrayMove(transactions, oldIndex, newIndex));
    },
    [transactions]
  );

  /* Navigation */
  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset, 1);
    setYear(newDate.getFullYear());
    setMonth(newDate.getMonth());
  };

  /* Render */
  const totalSpent = useMemo(
    () => transactions.reduce((a, t) => a + Number(t.spent || 0), 0),
    [transactions]
  );
  const totalBudget = useMemo(
    () => transactions.reduce((a, t) => a + Number(t.budget || 0), 0),
    [transactions]
  );

  return (
    <div className="dashboard-page">
      {/* Header restored */}
      <div className="dashboard-header">
        <button className="nav-arrow" onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <div className="month-title">
          <div className="month-name">
            {monthNames[month]} {year}
          </div>
          {viewedUserName && (
            <div className="viewed-user-line">
              Viewing: <strong>{viewedUserName}</strong>
            </div>
          )}
          <div className="month-range">
            {formatDate(start)} – {formatDate(end)}
          </div>
        </div>
        <button className="nav-arrow" onClick={() => changeMonth(1)}>
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
              <thead>
                <tr>
                  <th></th>
                  <th>Category</th>
                  <th>Spent</th>
                  <th>Budget</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>

              <TransactionsTable
                transactions={transactions}
                onChange={handleChange}
                onBlur={handleBlur}
                onDelete={handleDelete}
                onTypeToggle={handleTypeToggle}
                isNonOriginal={isNonOriginal}
                getSpentColor={getSpentColor}
                handleDragEnd={handleDragEnd}
              />

              <tfoot>
                <tr className="total-row">
                  <td></td>
                  <td>Total</td>
                  <td>
                    <b>{totalSpent.toLocaleString()}₪</b>
                  </td>
                  <td>
                    <b>{totalBudget.toLocaleString()}₪</b>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
