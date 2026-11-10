import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { BoxIcon, ReceiptIcon, ScissorsIcon } from "../../components/ui/icons";

// Feature components
import { ServiceForm } from "../../components/owner/ServiceForm";
import { StatusAction } from "../../components/owner/StatusAction";

// Types
import type { OwnerService } from "../../types";

// Utilities
import { formatDateTime, peso } from "../../lib/utils";

type ServiceInventoryTab = "services" | "supplies" | "recipes";
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
    currentQuantity: string;
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
    currentQuantity: "0",
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
    currentQuantity: String(supply.currentQuantity),
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

const UNIT_OPTIONS = [
    { value: "pcs", label: "Pieces (pcs)" },
    { value: "bottle", label: "Bottles (bottle)" },
    { value: "tube", label: "Tubes (tube)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "L", label: "Liters (L)" },
    { value: "g", label: "Grams (g)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "box", label: "Boxes (box)" },
    { value: "pack", label: "Packs (pack)" },
    { value: "set", label: "Sets (set)" },
    { value: "sachet", label: "Sachets (sachet)" },
    { value: "roll", label: "Rolls (roll)" },
    { value: "can", label: "Cans (can)" },
    { value: "jar", label: "Jars (jar)" },
    { value: "pair", label: "Pairs (pair)" },
    { value: "custom", label: "Other (custom unit)…" },
];

export interface ServicesPageProps {
    defaultTab?: ServiceInventoryTab;
}

export default function ServicesPage({ defaultTab = "services" }: ServicesPageProps) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab state from URL or prop fallback
    const rawTab = searchParams.get("tab") as ServiceInventoryTab | null;
    const activeTab: ServiceInventoryTab = useMemo(() => {
        if (rawTab === "services" || rawTab === "supplies" || rawTab === "recipes") {
            return rawTab;
        }
        return defaultTab;
    }, [rawTab, defaultTab]);

    const handleTabChange = (nextTab: ServiceInventoryTab) => {
        setSearchParams({ tab: nextTab });
    };

    // Shared state
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    // Services state
    const [services, setServices] = useState<OwnerService[]>([]);
    const [serviceSearch, setServiceSearch] = useState("");
    const [serviceCreating, setServiceCreating] = useState(false);
    const [serviceEditing, setServiceEditing] = useState<OwnerService | null>(null);
    const [deactivateFor, setDeactivateFor] = useState<OwnerService | null>(null);
    const [deleteFor, setDeleteFor] = useState<OwnerService | null>(null);

    // Supplies state
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [supplySearch, setSupplySearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [supplyEditing, setSupplyEditing] = useState<Supply | "new" | null>(null);
    const [supplyForm, setSupplyForm] = useState<SupplyForm>(emptySupplyForm);
    const [isCustomUnit, setIsCustomUnit] = useState(false);
    const [customUnitValue, setCustomUnitValue] = useState("");

    // Stock movements state
    const [adjustingSupply, setAdjustingSupply] = useState<Supply | null>(null);
    const [movementForm, setMovementForm] = useState({
        movementType: "purchase" as MovementType,
        quantity: "",
        unitCost: "",
        notes: "",
    });
    const [viewingMovements, setViewingMovements] = useState<Supply | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);

    // Recipes state
    const [recipeService, setRecipeService] = useState<OwnerService | null>(null);
    const [recipeValues, setRecipeValues] = useState<Record<number, string>>({});
    const [recipeSearch, setRecipeSearch] = useState("");

    // Combined data loader
    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [servicesRes, suppliesRes, alertsRes] = await Promise.all([
                api.get<{ data: OwnerService[] }>("/owner/services", {
                    params: { includeInactive: true },
                }),
                api.get<{ data: Supply[] }>("/owner/supplies", {
                    params: { includeInactive: true },
                }),
                api.get<{ data: Alert[] }>("/owner/inventory/alerts", {
                    params: { status: "open" },
                }),
            ]);
            setServices(servicesRes.data.data);
            setSupplies(suppliesRes.data.data);
            setAlerts(alertsRes.data.data);
        } catch {
            // Failures surface as toast via interceptor
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(reload);
    }, [reload]);

    // Service handlers
    const setServiceStatus = async (service: OwnerService, isActive: boolean) => {
        setBusy(true);
        try {
            await api.patch(`/owner/services/${service.id}/status`, { isActive });
            toast.success(`${service.name} ${isActive ? "activated" : "deactivated"}.`);
            setDeactivateFor(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const removeService = async (service: OwnerService) => {
        setBusy(true);
        try {
            await api.delete(`/owner/services/${service.id}`);
            toast.success(`${service.name} deleted.`);
            setDeleteFor(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    // Supply handlers
    const openCreateSupply = () => {
        setSupplyForm(emptySupplyForm());
        setIsCustomUnit(false);
        setCustomUnitValue("");
        setSupplyEditing("new");
    };

    const openEditSupply = (supply: Supply) => {
        const isStandard = UNIT_OPTIONS.some(
            (opt) => opt.value === supply.unit && opt.value !== "custom"
        );
        if (!isStandard) {
            setIsCustomUnit(true);
            setCustomUnitValue(supply.unit);
        } else {
            setIsCustomUnit(false);
            setCustomUnitValue("");
        }
        setSupplyForm(fromSupply(supply));
        setSupplyEditing(supply);
    };

    const saveSupply = async () => {
        const finalUnit = (isCustomUnit ? customUnitValue : supplyForm.unit).trim();
        if (!supplyForm.sku.trim() || !supplyForm.name.trim() || !finalUnit) {
            toast.error("SKU, name and unit of measurement are required.");
            return;
        }
        const qtyNum = Number(supplyForm.currentQuantity || 0);
        if (!Number.isFinite(qtyNum) || qtyNum < 0) {
            toast.error("Actual stock quantity must be 0 or more.");
            return;
        }
        setBusy(true);
        try {
            const payload = {
                sku: supplyForm.sku.trim(),
                name: supplyForm.name.trim(),
                category: supplyForm.category,
                unit: finalUnit,
                currentQuantity: qtyNum,
                reorderLevel: Number(supplyForm.reorderLevel || 0),
                unitCost: supplyForm.unitCost ? Number(supplyForm.unitCost) : null,
                supplier: supplyForm.supplier.trim() || null,
                notes: supplyForm.notes.trim() || null,
            };
            if (supplyEditing === "new") {
                await api.post("/owner/supplies", payload);
                toast.success("Supply created.");
            } else if (supplyEditing) {
                await api.put(`/owner/supplies/${supplyEditing.id}`, payload);
                toast.success("Supply updated.");
            }
            setSupplyEditing(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const saveMovement = async () => {
        if (!adjustingSupply) return;
        const quantity = Number(movementForm.quantity);
        if (!Number.isFinite(quantity) || quantity === 0) {
            toast.error("Enter a non-zero quantity.");
            return;
        }
        setBusy(true);
        try {
            await api.post(`/owner/supplies/${adjustingSupply.id}/movements`, {
                movementType: movementForm.movementType,
                quantity,
                unitCost: movementForm.unitCost ? Number(movementForm.unitCost) : null,
                notes: movementForm.notes || null,
            });
            toast.success("Stock updated.");
            setAdjustingSupply(null);
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

    // Recipe handlers
    const openRecipe = async (service: OwnerService) => {
        setRecipeService(service);
        try {
            const res = await api.get<{
                data: Array<{ supplyId: number; quantityPerService: number }>;
            }>(`/owner/services/${service.id}/supplies`);
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
            toast.success(`Service recipe saved for ${recipeService.name}.`);
            setRecipeService(null);
        } finally {
            setBusy(false);
        }
    };

    const acknowledgeAlert = async (alert: Alert) => {
        try {
            await api.patch(`/owner/inventory/alerts/${alert.id}/acknowledge`);
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    const resolveAlert = async (alert: Alert) => {
        try {
            await api.patch(`/owner/inventory/alerts/${alert.id}/resolve`);
            toast.success("Alert resolved.");
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    // Derived filtering & calculations
    const filteredServices = useMemo(() => {
        const term = serviceSearch.trim().toLowerCase();
        if (!term) return services;
        return services.filter(
            (s) =>
                s.name.toLowerCase().includes(term) ||
                s.description?.toLowerCase().includes(term)
        );
    }, [services, serviceSearch]);

    const filteredSupplies = useMemo(() => {
        let list = supplies;
        if (selectedCategory) {
            list = list.filter((s) => s.category === selectedCategory);
        }
        const term = supplySearch.trim().toLowerCase();
        if (term) {
            list = list.filter(
                (s) =>
                    s.name.toLowerCase().includes(term) ||
                    s.sku.toLowerCase().includes(term) ||
                    s.supplier?.toLowerCase().includes(term)
            );
        }
        return list;
    }, [supplies, selectedCategory, supplySearch]);

    const filteredRecipeServices = useMemo(() => {
        const term = recipeSearch.trim().toLowerCase();
        if (!term) return services;
        return services.filter((s) => s.name.toLowerCase().includes(term));
    }, [services, recipeSearch]);

    const lowStockCount = useMemo(
        () => supplies.filter((s) => s.lowStock && s.isActive).length,
        [supplies]
    );

    const totalStockValue = useMemo(
        () =>
            supplies.reduce(
                (sum, s) => sum + s.currentQuantity * (s.unitCost ?? 0),
                0
            ),
        [supplies]
    );

    return (
        <div className="grid gap-6">
            {/* Page Header */}
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Services &amp; Inventory
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        {activeTab === "services" &&
                            "Manage your salon's service menu, client pricing, and appointment durations."}
                        {activeTab === "supplies" &&
                            "Track salon supplies, actual stock levels, unit costs, and reorder alerts."}
                        {activeTab === "recipes" &&
                            "Configure product consumption recipes for automatic stock deduction on service completion."}
                    </p>
                </div>
                <div>
                    {activeTab === "services" && (
                        <button
                            type="button"
                            onClick={() => {
                                setServiceEditing(null);
                                setServiceCreating(true);
                            }}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press"
                        >
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add service
                        </button>
                    )}
                    {activeTab === "supplies" && (
                        <Button onClick={openCreateSupply}>New supply</Button>
                    )}
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="border-b border-border">
                <nav className="-mb-px flex gap-6" aria-label="Services and Inventory module tabs">
                    <button
                        type="button"
                        onClick={() => handleTabChange("services")}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                            activeTab === "services"
                                ? "border-primary-dark text-primary-dark font-semibold"
                                : "border-transparent text-muted hover:border-border hover:text-charcoal"
                        }`}
                    >
                        <ScissorsIcon />
                        <span>Services ({services.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("supplies")}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                            activeTab === "supplies"
                                ? "border-primary-dark text-primary-dark font-semibold"
                                : "border-transparent text-muted hover:border-border hover:text-charcoal"
                        }`}
                    >
                        <BoxIcon />
                        <span>Supplies &amp; Stock ({supplies.length})</span>
                        {alerts.length > 0 && (
                            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-bold text-warning">
                                {alerts.length} alert{alerts.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("recipes")}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                            activeTab === "recipes"
                                ? "border-primary-dark text-primary-dark font-semibold"
                                : "border-transparent text-muted hover:border-border hover:text-charcoal"
                        }`}
                    >
                        <ReceiptIcon />
                        <span>Service Recipes</span>
                    </button>
                </nav>
            </div>

            {/* TAB 1: SERVICES */}
            {activeTab === "services" && (
                <div className="grid gap-6">
                    <Card>
                        <Field
                            label="Search services"
                            placeholder="Search by service name or description…"
                            value={serviceSearch}
                            onChange={setServiceSearch}
                        />
                    </Card>

                    <Card title={`Service Menu (${filteredServices.length})`}>
                        {loading ? (
                            <p className="py-6 text-center text-sm text-muted">
                                Loading services…
                            </p>
                        ) : services.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium">No services yet</p>
                                <p className="mt-1 text-xs text-muted">
                                    Add your first salon service to enable client bookings.
                                </p>
                            </div>
                        ) : filteredServices.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium">
                                    No services match “{serviceSearch.trim()}”
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                    Try searching with a different term.
                                </p>
                            </div>
                        ) : (
                            <ul className="grid gap-3">
                                {filteredServices.map((service) => (
                                    <li
                                        key={service.id}
                                        className="rounded-xl border border-border p-4 transition-colors hover:border-primary/70"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-charcoal">
                                                {service.name}
                                            </span>
                                            <span className="rounded bg-charcoal/5 px-2 py-0.5 text-xs text-muted">
                                                {service.duration_minutes} min
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    service.is_active === 1
                                                        ? "bg-success-bg text-success"
                                                        : "bg-charcoal/10 text-charcoal"
                                                }`}
                                            >
                                                {service.is_active === 1 ? "Active" : "Inactive"}
                                            </span>
                                            <span className="ml-auto text-base font-bold text-charcoal">
                                                {peso(service.price)}
                                            </span>
                                        </div>

                                        {service.description && (
                                            <p className="mt-1.5 text-xs text-muted">
                                                {service.description}
                                            </p>
                                        )}

                                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                                            <StatusAction
                                                label="Edit"
                                                disabled={busy}
                                                onClick={() => {
                                                    setServiceCreating(false);
                                                    setServiceEditing(service);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void openRecipe(service)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-50"
                                            >
                                                <ReceiptIcon />
                                                <span>Recipe</span>
                                            </button>
                                            {service.is_active === 1 ? (
                                                <StatusAction
                                                    label="Deactivate"
                                                    disabled={busy}
                                                    onClick={() => setDeactivateFor(service)}
                                                />
                                            ) : (
                                                <StatusAction
                                                    label="Activate"
                                                    disabled={busy}
                                                    onClick={() => void setServiceStatus(service, true)}
                                                />
                                            )}
                                            <StatusAction
                                                label="Delete"
                                                disabled={busy}
                                                onClick={() => setDeleteFor(service)}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            )}

            {/* TAB 2: SUPPLIES & STOCK */}
            {activeTab === "supplies" && (
                <div className="grid gap-6">
                    {/* Alerts banner */}
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
                                                    : "Low stock"}
                                                : {alert.supplyName}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {alert.currentQuantity} left · reorder at{" "}
                                                {alert.reorderLevel}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void acknowledgeAlert(alert)}
                                                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-charcoal/5"
                                            >
                                                Acknowledge
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void resolveAlert(alert)}
                                                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-charcoal/5"
                                            >
                                                Resolve
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Stock KPI strip */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Total Supplies
                            </p>
                            <p className="mt-1 text-2xl font-bold">{supplies.length}</p>
                        </Card>
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Low Stock Items
                            </p>
                            <p
                                className={`mt-1 text-2xl font-bold ${
                                    lowStockCount > 0 ? "text-danger" : ""
                                }`}
                            >
                                {lowStockCount}
                            </p>
                        </Card>
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Total Stock Value
                            </p>
                            <p className="mt-1 text-2xl font-bold text-charcoal">
                                {peso(totalStockValue)}
                            </p>
                        </Card>
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Open Alerts
                            </p>
                            <p
                                className={`mt-1 text-2xl font-bold ${
                                    alerts.length > 0 ? "text-warning" : ""
                                }`}
                            >
                                {alerts.length}
                            </p>
                        </Card>
                    </div>

                    {/* Search & Category filter */}
                    <Card>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <Field
                                    label="Search supplies"
                                    placeholder="Search by name, SKU or supplier…"
                                    value={supplySearch}
                                    onChange={setSupplySearch}
                                />
                            </div>
                            <Select
                                label="Filter by category"
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                options={[
                                    { value: "", label: "All categories" },
                                    ...CATEGORY_OPTIONS,
                                ]}
                            />
                        </div>
                    </Card>

                    {/* Supplies Table */}
                    <Card title={`Supplies Directory (${filteredSupplies.length})`}>
                        {loading ? (
                            <p className="py-8 text-center text-sm text-muted">
                                Loading inventory…
                            </p>
                        ) : supplies.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-sm font-medium">No supplies yet</p>
                                <p className="mt-1 text-xs text-muted">
                                    Click "New supply" above to register chemicals, tools, or products.
                                </p>
                            </div>
                        ) : filteredSupplies.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-sm font-medium">No supplies match filters</p>
                                <p className="mt-1 text-xs text-muted">
                                    Try clearing the search or category filter.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                                            <th className="px-3 py-2">SKU</th>
                                            <th className="px-3 py-2">Name</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Stock on Hand</th>
                                            <th className="px-3 py-2">Reorder Level</th>
                                            <th className="px-3 py-2">Unit Cost</th>
                                            <th className="px-3 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSupplies.map((supply) => (
                                            <tr
                                                key={supply.id}
                                                className="border-b border-border/70 hover:bg-charcoal/[0.02]"
                                            >
                                                <td className="px-3 py-3 font-mono text-xs text-muted">
                                                    {supply.sku}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <p className="font-medium text-charcoal">
                                                        {supply.name}
                                                    </p>
                                                    {!supply.isActive && (
                                                        <span className="text-xs text-danger">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 capitalize text-muted">
                                                    {supply.category.replace("_", " ")}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className={
                                                            supply.lowStock
                                                                ? "font-bold text-danger"
                                                                : "font-semibold text-charcoal"
                                                        }
                                                    >
                                                        {supply.currentQuantity} {supply.unit}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-muted">
                                                    {supply.reorderLevel} {supply.unit}
                                                </td>
                                                <td className="px-3 py-3 text-muted">
                                                    {supply.unitCost === null
                                                        ? "—"
                                                        : peso(supply.unitCost)}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAdjustingSupply(supply);
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
                                                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-charcoal/5"
                                                        >
                                                            Stock
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditSupply(supply)}
                                                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-charcoal/5"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void openMovements(supply)}
                                                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-charcoal/5"
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
                </div>
            )}

            {/* TAB 3: SERVICE RECIPES */}
            {activeTab === "recipes" && (
                <div className="grid gap-6">
                    <Card>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-charcoal">
                            <p className="font-semibold text-primary-dark">
                                About Service Recipes
                            </p>
                            <p className="mt-1 text-xs text-muted">
                                Service recipes define the exact quantity of products and chemicals
                                consumed when a service is completed. When an appointment is marked as
                                finished, the system automatically deducts these recipe items from
                                your stock.
                            </p>
                        </div>
                    </Card>

                    <Card>
                        <Field
                            label="Filter services"
                            placeholder="Type to filter services…"
                            value={recipeSearch}
                            onChange={setRecipeSearch}
                        />
                    </Card>

                    <Card title={`All Services (${filteredRecipeServices.length})`}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredRecipeServices.map((service) => (
                                <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => void openRecipe(service)}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 text-left transition-all hover:border-primary/60 hover:bg-charcoal/[0.02]"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-charcoal text-sm">
                                            {service.name}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted">
                                            {service.duration_minutes} min · {peso(service.price)}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold text-primary-dark hover:underline">
                                        Edit recipe →
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* MODALS */}

            {/* 1. Service Modals */}
            {serviceCreating && (
                <Modal title="New service" onClose={() => setServiceCreating(false)}>
                    <ServiceForm
                        onDone={async (message) => {
                            setServiceCreating(false);
                            toast.success(message);
                            await reload();
                        }}
                        onCancel={() => setServiceCreating(false)}
                    />
                </Modal>
            )}

            {serviceEditing !== null && (
                <Modal
                    title={`Edit ${serviceEditing.name}`}
                    onClose={() => setServiceEditing(null)}
                >
                    <ServiceForm
                        service={serviceEditing}
                        onDone={async (message) => {
                            setServiceEditing(null);
                            toast.success(message);
                            await reload();
                        }}
                        onCancel={() => setServiceEditing(null)}
                    />
                </Modal>
            )}

            {deactivateFor !== null && (
                <ConfirmDialog
                    title={`Deactivate ${deactivateFor.name}?`}
                    confirmLabel="Deactivate"
                    busy={busy}
                    busyLabel="Deactivating…"
                    onConfirm={() => void setServiceStatus(deactivateFor, false)}
                    onCancel={() => setDeactivateFor(null)}
                    message={
                        <>
                            Deactivate <strong>{deactivateFor.name}</strong>? It will be hidden
                            from the public booking menu until you reactivate it.
                        </>
                    }
                />
            )}

            {deleteFor !== null && (
                <ConfirmDialog
                    title="Delete service"
                    confirmLabel="Delete"
                    busy={busy}
                    busyLabel="Deleting…"
                    onConfirm={() => void removeService(deleteFor)}
                    onCancel={() => setDeleteFor(null)}
                    message={
                        <>
                            <p>
                                Delete <strong>{deleteFor.name}</strong>? This cannot be undone.
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                Services with appointment history cannot be deleted — deactivate
                                them instead.
                            </p>
                        </>
                    }
                />
            )}

            {/* 2. Supply Modals */}
            {supplyEditing && (
                <Modal
                    title={supplyEditing === "new" ? "New supply" : `Edit ${supplyEditing.name}`}
                    onClose={() => setSupplyEditing(null)}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="SKU"
                            value={supplyForm.sku}
                            onChange={(value) => setSupplyForm((f) => ({ ...f, sku: value }))}
                        />
                        <Field
                            label="Name"
                            value={supplyForm.name}
                            onChange={(value) => setSupplyForm((f) => ({ ...f, name: value }))}
                        />
                        <Select
                            label="Category"
                            value={supplyForm.category}
                            onChange={(value) =>
                                setSupplyForm((f) => ({
                                    ...f,
                                    category: value as SupplyCategory,
                                }))
                            }
                            options={CATEGORY_OPTIONS}
                        />
                        <Select
                            label="Unit of measurement"
                            value={isCustomUnit ? "custom" : supplyForm.unit}
                            onChange={(value) => {
                                if (value === "custom") {
                                    setIsCustomUnit(true);
                                    setSupplyForm((f) => ({
                                        ...f,
                                        unit: customUnitValue || "",
                                    }));
                                } else {
                                    setIsCustomUnit(false);
                                    setSupplyForm((f) => ({ ...f, unit: value }));
                                }
                            }}
                            options={UNIT_OPTIONS}
                        />
                        {isCustomUnit && (
                            <div className="sm:col-span-2">
                                <Field
                                    label="Custom unit name"
                                    placeholder="Enter custom unit (e.g. ampoule, vial, sheet, etc.)"
                                    value={customUnitValue}
                                    onChange={(value) => {
                                        setCustomUnitValue(value);
                                        setSupplyForm((f) => ({ ...f, unit: value }));
                                    }}
                                />
                            </div>
                        )}
                        <Field
                            label={
                                supplyEditing === "new"
                                    ? `Actual initial stock (${(isCustomUnit ? customUnitValue : supplyForm.unit) || "units"})`
                                    : `Actual current stock (${(isCustomUnit ? customUnitValue : supplyForm.unit) || "units"})`
                            }
                            type="number"
                            value={supplyForm.currentQuantity}
                            onChange={(value) =>
                                setSupplyForm((f) => ({ ...f, currentQuantity: value }))
                            }
                        />
                        <Field
                            label={`Reorder level (${(isCustomUnit ? customUnitValue : supplyForm.unit) || "units"})`}
                            type="number"
                            value={supplyForm.reorderLevel}
                            onChange={(value) =>
                                setSupplyForm((f) => ({ ...f, reorderLevel: value }))
                            }
                        />
                        <Field
                            label="Unit cost (₱)"
                            type="number"
                            value={supplyForm.unitCost}
                            onChange={(value) =>
                                setSupplyForm((f) => ({ ...f, unitCost: value }))
                            }
                        />
                        <Field
                            label="Supplier"
                            value={supplyForm.supplier}
                            onChange={(value) =>
                                setSupplyForm((f) => ({ ...f, supplier: value }))
                            }
                        />
                        <div className="sm:col-span-2">
                            <Field
                                label="Notes"
                                value={supplyForm.notes}
                                onChange={(value) =>
                                    setSupplyForm((f) => ({ ...f, notes: value }))
                                }
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setSupplyEditing(null)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void saveSupply()} loading={busy}>
                            Save supply
                        </Button>
                    </div>
                </Modal>
            )}

            {/* 3. Stock Movement Modal */}
            {adjustingSupply && (
                <Modal
                    title={`Stock movement — ${adjustingSupply.name}`}
                    onClose={() => setAdjustingSupply(null)}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-muted">
                            Current stock: {adjustingSupply.currentQuantity} {adjustingSupply.unit}
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
                            <Button
                                variant="secondary"
                                onClick={() => setAdjustingSupply(null)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={() => void saveMovement()} loading={busy}>
                                Save movement
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* 4. Movement History Modal */}
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

            {/* 5. Service Recipe Modal */}
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
