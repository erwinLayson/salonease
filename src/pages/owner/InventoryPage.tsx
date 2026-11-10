import ServicesPage from "./ServicesPage";

/**
 * Backward-compatible page wrapper for /owner/inventory.
 * Services and Inventory are unified into a single tabbed module.
 */
export default function InventoryPage() {
    return <ServicesPage defaultTab="supplies" />;
}
