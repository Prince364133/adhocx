"use client";

import React, { useState, useEffect } from "react";
import { Car, Truck, Bus, Sliders, Plus, Bike } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { VehicleCategory } from "../../lib/api/types";
import {
  PageHeader,
  SegmentedTabs,
  FeedbackBanner,
  Card,
  DataTable,
  Button,
  Drawer,
  StatusBadge,
  Form,
  Input,
  Select,
} from "../../components/common";
import { DynamicDistancePricingSection } from "./DynamicDistancePricingSection";

type Section = "DISTANCE_ENGINE" | "CATEGORIES";

const emptyCategory = {
  vehicleType: "",
  categoryLabel: "",
  seatingCapacity: "",
  description: "",
  iconKey: "car",
};

function CategoryIcon({ c }: { c: VehicleCategory }) {
  const key = c.iconKey || "";
  if (key === "bike") return <Bike size={17} color="#F59E0B" />;
  if (key === "bus") return <Bus size={17} color="#10B981" />;
  if (key === "truck") return <Truck size={17} color="var(--brand-violet-text)" />;
  return <Car size={17} color="var(--text-brand)" />;
}

export default function PricingPage() {
  const [activeSection, setActiveSection] =
    useState<Section>("DISTANCE_ENGINE");
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Category add / edit
  const [editing, setEditing] = useState<VehicleCategory | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [savingCategory, setSavingCategory] = useState(false);

  async function loadAllData() {
    setLoading(true);
    try {
      const cats = await adminApi
        .getPricingTiers()
        .catch(() => [] as VehicleCategory[]);
      setCategories(Array.isArray(cats) ? cats : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (
      !newCategory.vehicleType.trim() ||
      !newCategory.categoryLabel.trim() ||
      !newCategory.seatingCapacity.trim()
    ) {
      setAlert({
        type: "error",
        message: "Code, name and seating capacity are required.",
      });
      return;
    }
    setSavingCategory(true);
    try {
      const created = await adminApi.createPricingTier({
        vehicleType: newCategory.vehicleType.trim(),
        categoryLabel: newCategory.categoryLabel.trim(),
        seatingCapacity: newCategory.seatingCapacity.trim(),
        description: newCategory.description.trim() || undefined,
        iconKey: newCategory.iconKey,
      });
      setAlert({
        type: "success",
        message: `Category ${created.vehicleType} added. It has no price until a distance plan covers it (its own plan, or the ALL plan).`,
      });
      setIsAddOpen(false);
      setNewCategory(emptyCategory);
      loadAllData();
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to add vehicle category",
      });
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingCategory(true);
    try {
      await adminApi.updatePricingTier(editing.vehicleType, {
        categoryLabel: editing.categoryLabel,
        seatingCapacity: editing.seatingCapacity,
        description: editing.description,
        iconKey: editing.iconKey || undefined,
        isActive: editing.isActive,
      });
      setAlert({
        type: "success",
        message: `Category ${editing.vehicleType} updated.`,
      });
      setEditing(null);
      loadAllData();
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to update vehicle category",
      });
    } finally {
      setSavingCategory(false);
    }
  }

  return (
    <div className="admin-page">
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      <PageHeader
        title="Pricing"
        subtitle="Condition-based rate cards for vendors and drivers with peak-hour configurations and distance step generators."
      />

      <SegmentedTabs
        tabs={[
          { id: "DISTANCE_ENGINE", label: "Rate Cards & Configuration" },
          { id: "CATEGORIES", label: "Vehicle Categories" },
        ]}
        activeTab={activeSection}
        onChange={setActiveSection}
      />

      {activeSection === "DISTANCE_ENGINE" && <DynamicDistancePricingSection />}

      {activeSection === "CATEGORIES" && (
        <Card>
          <div
            className="mb-5 flex justify-between items-center flex-wrap gap-3"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h3 className="font-bold text-primary text-title-md">
                Vehicle Categories
              </h3>
              <p className="text-sm text-muted mt-compact">
                Names and seating shown in the apps. Prices are set per category
                in Distance Pricing; a category without its own plan uses the
                ALL plan.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={15} />}
              onClick={() => setIsAddOpen(true)}
            >
              Add Category
            </Button>
          </div>

          <DataTable
            columns={[
              {
                header: "CATEGORY",
                accessor: (c: VehicleCategory) => (
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-md flex items-center justify-center"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "rgba(var(--brand-accent-rgb), 0.1)",
                      }}
                    >
                      <CategoryIcon c={c} />
                    </div>
                    <div>
                      <div className="font-semibold text-primary text-md">
                        {c.categoryLabel}
                      </div>
                      <div className="text-sm text-muted text-mono">
                        {c.vehicleType}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                header: "SEATING",
                accessor: (c: VehicleCategory) => c.seatingCapacity,
              },
              {
                header: "DESCRIPTION",
                accessor: (c: VehicleCategory) => c.description || "",
              },
              {
                header: "STATUS",
                accessor: (c: VehicleCategory) => (
                  <StatusBadge
                    status={c.isActive === false ? "INACTIVE" : "ACTIVE"}
                    size="sm"
                  />
                ),
              },
              {
                header: "ACTIONS",
                align: "right",
                accessor: (c: VehicleCategory) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing({ ...c });
                    }}
                  >
                    Edit
                  </Button>
                ),
              },
            ]}
            data={categories}
            keyExtractor={(c) => c.vehicleType}
            loading={loading}
            emptyTitle="No vehicle categories"
            emptySubtitle="Add a category to make it bookable."
          />
        </Card>
      )}

      {/* Add category */}
      <Drawer
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Vehicle Category"
        subtitle="Catalogue only. Set its price in Distance Pricing (or let the ALL plan cover it)."
        icon={<Car size={18} />}
        width="min(94vw, 520px)"
        footer={
          <div className="flex gap-3 w-full justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={savingCategory}
              onClick={handleCreateCategory}
            >
              Add Category
            </Button>
          </div>
        }
      >
        <Form
          onSubmit={handleCreateCategory}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <Input
            label="Code (e.g. EV_SEDAN)"
            required
            value={newCategory.vehicleType}
            onChange={(e) =>
              setNewCategory({ ...newCategory, vehicleType: e.target.value })
            }
          />
          <Input
            label="Display name"
            required
            value={newCategory.categoryLabel}
            onChange={(e) =>
              setNewCategory({ ...newCategory, categoryLabel: e.target.value })
            }
          />
          <Input
            label="Seating capacity (e.g. 4 + 1 Passengers)"
            required
            value={newCategory.seatingCapacity}
            onChange={(e) =>
              setNewCategory({
                ...newCategory,
                seatingCapacity: e.target.value,
              })
            }
          />
          <Input
            label="Description"
            value={newCategory.description}
            onChange={(e) =>
              setNewCategory({ ...newCategory, description: e.target.value })
            }
          />
          <Select
            label="Icon"
            value={newCategory.iconKey}
            onChange={(e) =>
              setNewCategory({ ...newCategory, iconKey: e.target.value })
            }
            options={[
              { value: "car", label: "Car" },
              { value: "truck", label: "Van / Traveller" },
              { value: "bus", label: "Bus" },
              { value: "bike", label: "Bike" },
            ]}
          />
        </Form>
      </Drawer>

      {/* Edit category */}
      <Drawer
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.vehicleType || ""}`}
        subtitle="Deactivated categories cannot be booked. Deactivation is refused while trips in the category are running."
        icon={<Sliders size={18} />}
        width="min(94vw, 520px)"
        footer={
          <div className="flex gap-3 w-full justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={savingCategory}
              onClick={handleSaveCategory}
            >
              Save
            </Button>
          </div>
        }
      >
        {editing && (
          <Form
            onSubmit={handleSaveCategory}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Input
              label="Display name"
              value={editing.categoryLabel}
              onChange={(e) =>
                setEditing({ ...editing, categoryLabel: e.target.value })
              }
            />
            <Input
              label="Seating capacity"
              value={editing.seatingCapacity}
              onChange={(e) =>
                setEditing({ ...editing, seatingCapacity: e.target.value })
              }
            />
            <Input
              label="Description"
              value={editing.description || ""}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
            />
            <label className="flex items-center gap-2 text-md text-primary">
              <input
                type="checkbox"
                checked={editing.isActive !== false}
                onChange={(e) =>
                  setEditing({ ...editing, isActive: e.target.checked })
                }
              />
              Active (bookable)
            </label>
          </Form>
        )}
      </Drawer>
    </div>
  );
}
