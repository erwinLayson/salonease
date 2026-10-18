import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { formatDateTime, peso } from "../../lib/utils";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

import type { OwnerService } from "../../types";

type SupplyCategory = "chemical" | "tool" | "event_kit" | "retail" | "other";
type MovementType = "initial" | "purchase" | "adjustment" | "waste" | "return";

interface Supply {
    id: number;
    sku: string;
    name: string;
    category: SupplyCategory;
    unit: string;
    currentQuantity: number;
    reorderLevel: number;
    unitCost: number | null;
    supplier: string | null;
    notes: string | null;
    isActive: boolean;
    lowStock: boolean;
}

interface Movement {
    id: number;
    supplyName: string;
    movementType: string;
    quantityDelta: number;
    balanceAfter: number;
    notes: string | null;
    createdAt: string;
}

interface Alert {
    id: number;
    supplyId: number;
    supplyName: string;
    alertType: "low_stock" | "out_of_stock";
    status: "open" | "acknowledged" | "resolved";
    currentQuantity: number;
    reorderLevel: number;
    createdAt: string;
}

interface SupplyForm {
    sku: string;
    name: string;
    category: SupplyCategory;
    unit: string;
    reorderLevel: string;
    unitCost: string;
    supplier: string;
    notes: string;
}

const emptySupplyForm = (): SupplyForm => ({
    sku: "",
    name: "",
    category: "chemical",
    unit: "pcs",
    reorderLevel: "0",
    unitCost: "",
    supplier: "",
    notes: "",
});

const fromSupply = (supply: Supply): SupplyForm => ({
    sku: supply.sku,
    name: supply.name,
    category: supply.category,
    unit: supply.unit,
    reorderLevel: String(supply.reorderLevel),
    unitCost: supply.unitCost === null ? "" : String(supply.unitCost),
    supplier: supply.supplier ?? "",
    notes: supply.notes ?? "",
});

const CATEGORY_OPTIONS = [
    { value: "chemical", label: "Chemical" },
    { value: "tool", label: "Tool" },
    { value: "event_kit", label: "Event kit" },
    { value: "retail", label: "Retail" },
    { value: "other", label: "Other" },
];

const MOVEMENT_OPTIONS = [
    { value: "purchase", label: "Purchase / receive" },
    { value: "initial", label: "Initial stock" },
    { value: "adjustment", label: "Adjustment (+/-)" },
    { value: "waste", label: "Waste / spoilage" },
    { value: "return", label: "Return to stock" },
];

export default function InventoryPage() {
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [services, setServices] = useState<OwnerService[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Supply | "new" | null>(null);
    const [form, setForm] = useState<SupplyForm>(emptySupplyForm);
    const [adjusting, setAdjusting] = useState<Supply | null>(null);
    const [movementForm, setMovementForm] = useState({
        movementType: "purchase" as MovementType,
        quantity: "",
        unitCost: "",
        notes: "",
    });
    const [viewingMovements, setViewingMovements] = useState<Supply | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [recipeService, setRecipeService] = useState<OwnerService | null>(null);
    const [recipeValues, setRecipeValues] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [supplyRes, alertRes] = await Promise.all([
                api.get<{ data: Supply[] }>("/owner/supplies", {
                    params: { includeInactive: true },
                }),
                api.get<{ data: Alert[] }>("/owner/inventory/alerts", {
                    params: { status: "open" },
                }),
            ]);
            setSupplies(supplyRes.data.data);
            setAlerts(alertRes.data.data);
        } catch {
            // toast via interceptor
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        void api
            .get<{ data: OwnerService[] }>("/owner/services", {
                params: { includeInactive: true },
            })
            .then((res) => setServices(res.data.data))
            .catch(() => {});
    }, []);

    const openCreate = () => {
        setForm(emptySupplyForm());
        setEditing("new");
    };

    const openEdit = (supply: Supply) => {
        setForm(fromSupply(supply));
        setEditing(supply);
    };

    const saveSupply = async () => {
        if (!form.sku.trim() || !form.name.trim() || !form.unit.trim()) {
            toast.error("SKU, name and unit are required.");
            return;
        }
        setBusy(true);
        try {
            const payload = {
                sku: form.sku,
                name: form.name,
                category: form.category,
                unit: form.unit,
                reorderLevel: Number(form.reorderLevel || 0),
                unitCost: form.unitCost ? Number(form.unitCost) : null,
                supplier: form.supplier || null,
                notes: form.notes || null,
            };
            if (editing === "new") {
                await api.post("/owner/supplies", payload);
                toast.success("Supply created.");
            } else if (editing) {
                await api.put(`/owner/supplies/${editing.id}`, payload);
                toast.success("Supply updated.");
            }
            setEditing(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const saveMovement = async () => {
        if (!adjusting) return;
        const quantity = Number(movementForm.quantity);
        if (!Number.isFinite(quantity) || quantity === 0) {
            toast.error("Enter a non-zero quantity.");
            return;
        }
        setBusy(true);
        try {
            await api.post(`/owner/supplies/${adjusting.id}/movements`, {
                movementType: movementForm.movementType,
                quantity,
                unitCost: movementForm.unitCost
                    ? Number(movementForm.unitCost)
                    : null,
                notes: movementForm.notes || null,
            });
            toast.success("Stock updated.");
            setAdjusting(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const openMovements = async (supply: Supply) => {
        setViewingMovements(supply);
        try {
            const res = await api.get<{ data: Movement[] }>(
                `/owner/supplies/${supply.id}/movements`
            );
            setMovements(res.data.data);
        } catch {
            setMovements([]);
        }
    };

    const openRecipe = async (service: OwnerService) => {
        setRecipeService(service);
        try {
            const res = await api.get<{ data: Array<{ supplyId: number; quantityPerService: number }> }>(
                `/owner/services/${service.id}/supplies`
            );
            const values: Record<number, string> = {};
            for (const item of res.data.data) {
                values[item.supplyId] = String(item.quantityPerService);
            }
            setRecipeValues(values);
        } catch {
            setRecipeValues({});
        }
    };

    const saveRecipe = async () => {
        if (!recipeService) return;
        const items = Object.entries(recipeValues)
            .map(([supplyId, value]) => {
                const supply = supplies.find((item) => item.id === Number(supplyId));
                const quantity = Number(value);
                if (!supply || !Number.isFinite(quantity) || quantity <= 0) return null;
                return {
                    supplyId: supply.id,
                    quantityPerService: quantity,
                    unit: supply.unit,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        setBusy(true);
        try {
            await api.put(`/owner/services/${recipeService.id}/supplies`, { items });
            toast.success("Service recipe saved.");
            setRecipeService(null);
        } finally {
            setBusy(false);
        }
    };

    const acknowledge = async (alert: Alert) => {
        try {
            await api.patch(`/owner/inventory/alerts/${alert.id}/acknowledge`);
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    const resolve = async (alert: Alert) => {
        try {
            await api.patch(`/owner/inventory/alerts/${alert.id}/resolve`);
            toast.success("Alert resolved.");
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    const lowStock = supplies.filter((supply) => supply.lowStock && supply.isActive);
    const totalValue = supplies.reduce(
        (sum, supply) =>
            sum + supply.currentQuantity * (supply.unitCost ?? 0),
        0
    );

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
                    <p className="mt-1 text-sm text-muted">
                        Track chemicals, tools and event kits. Completed services deduct
                        their recipe automatically.
                    </p>
                </div>
                <Button onClick={openCreate}>New supply</Button>
            </header>

            {alerts.length > 0 && (
                <Card title={`Low-stock alerts (${alerts.length})`}>
                    <ul className="space-y-2">
                        {alerts.map((alert) => (
                            <li
                                key={alert.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning-line bg-warning-bg/30 p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {alert.alertType === "out_of_stock"
                                            ? "Out of stock"
                                            : "Low stock"}: {alert.supplyName}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {alert.currentQuantity} left · reorder at{" "}
                                        {alert.reorderLevel}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void acknowledge(alert)}
                                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                    >
                                        Acknowledge
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void resolve(alert)}
                                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                    >
                                        Resolve
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Supplies
                    </p>
                    <p className="mt-1 text-2xl font-bold">{supplies.length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Low stock
                    </p>
                    <p className="mt-1 text-2xl font-bold">{lowStock.length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Stock value
                    </p>
                    <p className="mt-1 text-2xl font-bold">{peso(totalValue)}</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Open alerts
                    </p>
                    <p className="mt-1 text-2xl font-bold">{alerts.length}</p>
                </Card>
            </div>

            <Card title="Supplies">
                {loading ? (
                    <p className="py-8 text-center text-sm text-muted">Loading inventory…</p>
                ) : supplies.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted">
                        No supplies yet. Create your first supply, then add stock.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                                    <th className="px-3 py-2">SKU</th>
                                    <th className="px-3 py-2">Name</th>
                                    <th className="px-3 py-2">Category</th>
                                    <th className="px-3 py-2">Stock</th>
                                    <th className="px-3 py-2">Reorder</th>
                                    <th className="px-3 py-2">Unit cost</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplies.map((supply) => (
                                    <tr key={supply.id} className="border-b border-border/70">
                                        <td className="px-3 py-3 font-mono text-xs">
                                            {supply.sku}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{supply.name}</p>
                                            {!supply.isActive && (
                                                <span className="text-xs text-danger">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 capitalize">
                                            {supply.category.replace("_", " ")}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={
                                                    supply.lowStock
                                                        ? "font-semibold text-danger"
                                                        : "font-medium"
                                                }
                                            >
                                                {supply.currentQuantity} {supply.unit}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {supply.reorderLevel} {supply.unit}
                                        </td>
                                        <td className="px-3 py-3">
                                            {supply.unitCost === null
                                                ? "—"
                                                : peso(supply.unitCost)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdjusting(supply);
                                                        setMovementForm({
                                                            movementType: "purchase",
                                                            quantity: "",
                                                            unitCost:
                                                                supply.unitCost === null
                                                                    ? ""
                                                                    : String(supply.unitCost),
                                                            notes: "",
                                                        });
                                                    }}
                                                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                                >
                                                    Stock
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(supply)}
                                                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void openMovements(supply)}
                                                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                                >
                                                    History
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card
                title="Service recipes"
                actions={
                    <span className="text-xs text-muted">
                        used for automatic deduction on completion
                    </span>
                }
            >
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            type="button"
                            onClick={() => void openRecipe(service)}
                            className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-left text-sm transition-colors hover:bg-charcoal/5"
                        >
                            <span>
                                <span className="font-medium">{service.name}</span>
                                <span className="ml-1 text-xs text-muted">
                                    ({service.duration_minutes}m)
                                </span>
                            </span>
                            <span className="text-xs text-primary-dark">Edit recipe</span>
                        </button>
                    ))}
                </div>
            </Card>

            {editing && (
                <Modal
                    title={editing === "new" ? "New supply" : `Edit ${editing.name}`}
                    onClose={() => setEditing(null)}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="SKU"
                            value={form.sku}
                            onChange={(value) => setForm((f) => ({ ...f, sku: value }))}
                        />
                        <Field
                            label="Name"
                            value={form.name}
                            onChange={(value) => setForm((f) => ({ ...f, name: value }))}
                        />
                        <Select
                            label="Category"
                            value={form.category}
                            onChange={(value) =>
                                setForm((f) => ({ ...f, category: value as SupplyCategory }))
                            }
                            options={CATEGORY_OPTIONS}
                        />
                        <Field
                            label="Unit (ml, g, pcs, bottle…)"
                            value={form.unit}
                            onChange={(value) => setForm((f) => ({ ...f, unit: value }))}
                        />
                        <Field
                            label="Reorder level"
                            type="number"
                            value={form.reorderLevel}
                            onChange={(value) =>
                                setForm((f) => ({ ...f, reorderLevel: value }))
                            }
                        />
                        <Field
                            label="Unit cost (₱)"
                            type="number"
                            value={form.unitCost}
                            onChange={(value) => setForm((f) => ({ ...f, unitCost: value }))}
                        />
                        <Field
                            label="Supplier"
                            value={form.supplier}
                            onChange={(value) => setForm((f) => ({ ...f, supplier: value }))}
                        />
                        <Field
                            label="Notes"
                            value={form.notes}
                            onChange={(value) => setForm((f) => ({ ...f, notes: value }))}
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void saveSupply()} loading={busy}>
                            Save supply
                        </Button>
                    </div>
                </Modal>
            )}

            {adjusting && (
                <Modal
                    title={`Stock movement — ${adjusting.name}`}
                    onClose={() => setAdjusting(null)}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-muted">
                            Current stock: {adjusting.currentQuantity} {adjusting.unit}
                        </p>
                        <Select
                            label="Movement type"
                            value={movementForm.movementType}
                            onChange={(value) =>
                                setMovementForm((f) => ({
                                    ...f,
                                    movementType: value as MovementType,
                                }))
                            }
                            options={MOVEMENT_OPTIONS}
                        />
                        <Field
                            label="Quantity (negative only for adjustment)"
                            type="number"
                            value={movementForm.quantity}
                            onChange={(value) =>
                                setMovementForm((f) => ({ ...f, quantity: value }))
                            }
                        />
                        <Field
                            label="Unit cost (optional)"
                            type="number"
                            value={movementForm.unitCost}
                            onChange={(value) =>
                                setMovementForm((f) => ({ ...f, unitCost: value }))
                            }
                        />
                        <Field
                            label="Notes"
                            value={movementForm.notes}
                            onChange={(value) =>
                                setMovementForm((f) => ({ ...f, notes: value }))
                            }
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setAdjusting(null)}>
                                Cancel
                            </Button>
                            <Button onClick={() => void saveMovement()} loading={busy}>
                                Save movement
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {viewingMovements && (
                <Modal
                    title={`Movement history — ${viewingMovements.name}`}
                    onClose={() => setViewingMovements(null)}
                >
                    {movements.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted">
                            No movements recorded.
                        </p>
                    ) : (
                        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
                            {movements.map((movement) => (
                                <li
                                    key={movement.id}
                                    className="rounded-xl border border-border p-3 text-sm"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium capitalize">
                                            {movement.movementType.replace("_", " ")}
                                        </span>
                                        <span
                                            className={
                                                movement.quantityDelta < 0
                                                    ? "font-semibold text-danger"
                                                    : "font-semibold text-success"
                                            }
                                        >
                                            {movement.quantityDelta > 0 ? "+" : ""}
                                            {movement.quantityDelta}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted">
                                        Balance: {movement.balanceAfter} ·{" "}
                                        {formatDateTime(movement.createdAt)}
                                    </p>
                                    {movement.notes && (
                                        <p className="mt-1 text-xs text-muted">
                                            {movement.notes}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            )}

            {recipeService && (
                <Modal
                    title={`Recipe — ${recipeService.name}`}
                    onClose={() => setRecipeService(null)}
                >
                    <p className="mb-4 text-sm text-muted">
                        Enter the quantity of each supply consumed by one completed
                        service. Leave blank for supplies this service does not use.
                    </p>
                    <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                        {supplies
                            .filter((supply) => supply.isActive)
                            .map((supply) => (
                                <div
                                    key={supply.id}
                                    className="flex items-center gap-3 rounded-xl border border-border p-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {supply.name}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {supply.currentQuantity} {supply.unit} on hand
                                        </p>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={recipeValues[supply.id] ?? ""}
                                        onChange={(event) =>
                                            setRecipeValues((values) => ({
                                                ...values,
                                                [supply.id]: event.target.value,
                                            }))
                                        }
                                        className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm"
                                        aria-label={`Quantity for ${supply.name}`}
                                    />
                                    <span className="w-12 text-xs text-muted">
                                        {supply.unit}
                                    </span>
                                </div>
                            ))}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setRecipeService(null)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void saveRecipe()} loading={busy}>
                            Save recipe
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
