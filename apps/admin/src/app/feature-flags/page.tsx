"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  Wallet,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  User,
  Tag,
  Smartphone,
  Globe,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { FeatureFlagItem } from "../../lib/api/types";
import { Button } from "../../components/common/Button";
import { Drawer } from "../../components/common/Drawer";
import { Form } from "../../components/common/Form";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Create Flag Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("PAYMENTS");
  const [newIsEnabled, setNewIsEnabled] = useState(true);
  const [creating, setCreating] = useState(false);

  // Load feature flags
  const loadFlags = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFeatureFlags();
      setFlags(data || []);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to load feature flags",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  // Filtered flags
  const categories = useMemo(() => {
    const set = new Set<string>();
    flags.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [flags]);

  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      const matchesCategory =
        selectedCategory === "ALL" || f.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [flags, selectedCategory, searchQuery]);

  // Stats
  const activeCount = flags.filter((f) => f.isEnabled).length;
  const totalCount = flags.length;

  // Toggle Handler with optional platform targeting
  const handleToggle = async (
    flag: FeatureFlagItem,
    platform?: "android" | "web" | "all",
    forceState?: boolean,
  ) => {
    const meta = (flag.metadata && typeof flag.metadata === "object") ? flag.metadata : {};
    let targetState: boolean;

    if (forceState !== undefined) {
      targetState = forceState;
    } else if (platform === "android") {
      targetState = !(meta.android ?? flag.isEnabled);
    } else if (platform === "web") {
      targetState = !(meta.web ?? flag.isEnabled);
    } else {
      targetState = !flag.isEnabled;
    }

    const togglingId = platform ? `${flag.key}_${platform}` : flag.key;
    setTogglingKey(togglingId);

    // Optimistic UI update
    setFlags((prev) =>
      prev.map((f) => {
        if (f.key !== flag.key) return f;
        const currentMeta = (f.metadata && typeof f.metadata === "object") ? { ...f.metadata } : {};
        const nextMeta = { ...currentMeta };
        let nextIsEnabled = f.isEnabled;

        if (platform === "android") {
          nextMeta.android = targetState;
          if (nextMeta.web === undefined) nextMeta.web = f.isEnabled;
          nextIsEnabled = Boolean(nextMeta.android || nextMeta.web);
        } else if (platform === "web") {
          nextMeta.web = targetState;
          if (nextMeta.android === undefined) nextMeta.android = f.isEnabled;
          nextIsEnabled = Boolean(nextMeta.android || nextMeta.web);
        } else {
          nextMeta.android = targetState;
          nextMeta.web = targetState;
          nextIsEnabled = targetState;
        }

        return {
          ...f,
          isEnabled: nextIsEnabled,
          metadata: nextMeta,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    try {
      const updated = await adminApi.toggleFeatureFlag(flag.key, targetState, platform);
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? updated : f)));
      const platformLabel =
        platform === "android"
          ? "Android App"
          : platform === "web"
          ? "Web Portal"
          : "All Platforms";
      setAlert({
        type: "success",
        message: `Feature flag "${flag.name}" (${platformLabel}) is now ${targetState ? "ENABLED" : "DISABLED"}. Changes take effect across clients in real time.`,
      });
    } catch (err: any) {
      // Revert optimistic update on failure
      setFlags((prev) =>
        prev.map((f) => (f.key === flag.key ? flag : f)),
      );
      setAlert({
        type: "error",
        message: err.message || `Failed to update ${flag.key}`,
      });
    } finally {
      setTogglingKey(null);
    }
  };

  // Create Flag Handler
  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim()) {
      setAlert({ type: "error", message: "Key and Name are required." });
      return;
    }

    setCreating(true);
    try {
      const created = await adminApi.createFeatureFlag({
        key: newKey.trim().toLowerCase(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        isEnabled: newIsEnabled,
      });

      setFlags((prev) => [
        created,
        ...prev.filter((f) => f.key !== created.key),
      ]);
      setIsCreateOpen(false);
      setNewKey("");
      setNewName("");
      setNewDescription("");
      setNewIsEnabled(true);
      setAlert({
        type: "success",
        message: `Feature flag "${created.name}" created successfully and initialized to ${created.isEnabled ? "ENABLED" : "DISABLED"}.`,
      });
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to create feature flag",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="my-0 mx-auto p-6 flex flex-col gap-6"
      style={{ maxWidth: "1280px" }}
    >
      {/* Alert Banner */}
      {alert && (
        <div
          className="flex items-center justify-between rounded-md text-md font-medium"
          style={{
            padding: "0.85rem 1.15rem",
            background:
              alert.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${alert.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: alert.type === "success" ? "#10B981" : "#EF4444",
          }}
        >
          <div className="flex items-center gap-medium">
            {alert.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="bg-transparent border-0 cursor-pointer font-bold"
            style={{ color: "inherit" }}
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center" style={{ gap: "0.65rem" }}>
            <div
              className="rounded-md flex items-center justify-center"
              style={{
                width: "38px",
                height: "38px",
                background: "linear-gradient(135deg, var(--brand-indigo-bright), var(--brand-violet))",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(var(--brand-indigo-rgb), 0.25)",
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h1
                className="font-extrabold text-primary m-0"
                style={{ fontSize: "1.45rem" }}
              >
                Feature Flags & Platform Controls
              </h1>
              <p
                className="text-secondary text-body-md"
                style={{ margin: "0.2rem 0 0 0" }}
              >
                Control live client features, vendor wallet accessibility,
                web/mobile gating, and operational rollouts in real time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadFlags}
            isLoading={loading}
          >
            <RefreshCw size={14} style={{ marginRight: "0.35rem" }} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={15} style={{ marginRight: "0.35rem" }} /> Add Feature
            Flag
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
      >
        <div className="bg-card py-4 px-5 rounded-md border flex items-center gap-4">
          <div
            className="rounded-sm flex items-center justify-center"
            style={{
              width: "42px",
              height: "42px",
              background: "rgba(var(--brand-indigo-rgb), 0.1)",
              color: "var(--brand-indigo-bright-text)",
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div className="text-sm text-muted font-semibold uppercase">
              Total Configured Flags
            </div>
            <div className="text-2xl font-extrabold text-primary">
              {totalCount}
            </div>
          </div>
        </div>

        <div className="bg-card py-4 px-5 rounded-md border flex items-center gap-4">
          <div
            className="rounded-sm flex items-center justify-center"
            style={{
              width: "42px",
              height: "42px",
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10B981",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-sm text-muted font-semibold uppercase">
              Active (Enabled)
            </div>
            <div
              className="text-2xl font-extrabold"
              style={{ color: "#10B981" }}
            >
              {activeCount}
            </div>
          </div>
        </div>

        <div className="bg-card py-4 px-5 rounded-md border flex items-center gap-4">
          <div
            className="rounded-sm flex items-center justify-center"
            style={{
              width: "42px",
              height: "42px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#EF4444",
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div className="text-sm text-muted font-semibold uppercase">
              Disabled (Gated)
            </div>
            <div
              className="text-2xl font-extrabold"
              style={{ color: "#EF4444" }}
            >
              {totalCount - activeCount}
            </div>
          </div>
        </div>

        <div className="bg-card py-4 px-5 rounded-md border flex items-center gap-4">
          <div
            className="rounded-sm flex items-center justify-center"
            style={{
              width: "42px",
              height: "42px",
              background: "rgba(245, 158, 11, 0.1)",
              color: "#F59E0B",
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div className="text-sm text-muted font-semibold uppercase">
              Sync Engine
            </div>
            <div className="font-extrabold text-primary text-body">
              Live API & Mobile Sync
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex justify-between items-center flex-wrap gap-3 bg-card py-3 px-4 rounded-md border">
        <div
          className="flex items-center gap-2 flex-1"
          style={{ minWidth: "240px" }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search feature flags by name, key, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 text-primary text-body"
            style={{ outline: "none" }}
          />
        </div>

        <div className="flex flex-wrap gap-tight">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-sm text-sm font-semibold cursor-pointer"
              style={{
                padding: "0.35rem 0.75rem",
                border: "1px solid",
                borderColor:
                  selectedCategory === cat
                    ? "var(--border-focus)"
                    : "var(--border)",
                background:
                  selectedCategory === cat
                    ? "var(--brand-primary)"
                    : "transparent",
                color:
                  selectedCategory === cat ? "#fff" : "var(--text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Flags Cards Grid */}
      <div className="flex flex-col gap-4">
        {filteredFlags.map((flag) => {
          const isToggling = togglingKey === flag.key;
          const isVendorWallet = flag.key === "vendor_wallet";
          const meta = (flag.metadata && typeof flag.metadata === "object") ? flag.metadata : {};
          const androidEnabled = meta?.android ?? flag.isEnabled;
          const webEnabled = meta?.web ?? flag.isEnabled;
          const isAndroidToggling = togglingKey === `${flag.key}_android`;
          const isWebToggling = togglingKey === `${flag.key}_web`;

          return (
            <div
              key={flag.id || flag.key}
              className="bg-card rounded-md p-5 flex justify-between items-center gap-6 flex-wrap"
              style={{
                border: `1px solid ${flag.isEnabled ? "rgba(var(--brand-indigo-rgb), 0.3)" : "var(--border)"}`,
                boxShadow: flag.isEnabled
                  ? "0 4px 20px rgba(var(--brand-indigo-rgb), 0.06)"
                  : "none",
                transition: "all 0.2s ease",
              }}
            >
              {/* Flag Info */}
              <div
                className="feature-flag-info flex-1 flex flex-col gap-snug"
                style={{ minWidth: "280px" }}
              >
                <div className="flex items-center flex-wrap gap-medium">
                  {isVendorWallet ? (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        background: "rgba(var(--brand-indigo-rgb), 0.15)",
                        color: "var(--brand-indigo-bright-text)",
                      }}
                    >
                      <Wallet size={16} />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10B981",
                      }}
                    >
                      <Tag size={16} />
                    </div>
                  )}

                  <span className="font-extrabold text-primary text-title-sm">
                    {flag.name}
                  </span>

                  <code
                    className="rounded-xs bg-surface-elevated border text-secondary text-mono text-label"
                    style={{ padding: "0.15rem 0.45rem" }}
                  >
                    {flag.key}
                  </code>

                  <span
                    className="font-bold uppercase text-micro"
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      background:
                        flag.category === "PAYMENTS"
                          ? "rgba(var(--brand-indigo-rgb), 0.12)"
                          : "rgba(16, 185, 129, 0.12)",
                      color:
                        flag.category === "PAYMENTS" ? "var(--brand-indigo-bright-text)" : "#10B981",
                      border: `1px solid ${flag.category === "PAYMENTS" ? "rgba(var(--brand-indigo-rgb), 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
                    }}
                  >
                    {flag.category}
                  </span>
                </div>

                <div
                  className="text-secondary text-body-md"
                  style={{ lineHeight: 1.5 }}
                >
                  {flag.description || "No description provided."}
                </div>

                {/* Audit & Timing Pills */}
                <div className="flex items-center text-muted flex-wrap gap-relaxed mt-tight text-label">
                  {flag.updatedBy && (
                    <span
                      className="flex items-center"
                      style={{ gap: "0.3rem" }}
                    >
                      <User size={12} /> Updated by:{" "}
                      <strong>{flag.updatedBy}</strong>
                    </span>
                  )}
                  {flag.updatedAt && (
                    <span
                      className="flex items-center"
                      style={{ gap: "0.3rem" }}
                    >
                      <Clock size={12} />{" "}
                      {new Date(flag.updatedAt).toLocaleString()}
                    </span>
                  )}
                  {isVendorWallet && (
                    <span
                      className="font-semibold flex items-center gap-1.5"
                      style={{ color: "var(--brand-lavender-light)" }}
                    >
                      ⚡ Platform Status:{" "}
                      {androidEnabled && webEnabled
                        ? "Android App & Web Portal (Both Active)"
                        : androidEnabled
                        ? "Android App Only (Web Gated)"
                        : webEnabled
                        ? "Web Portal Only (Android Gated)"
                        : "Disabled on All Platforms"}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle Controls */}
              {isVendorWallet ? (
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Android Toggle Card */}
                  <div
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-md border"
                    style={{
                      background: "var(--bg-surface-elevated)",
                      borderColor: androidEnabled
                        ? "rgba(16, 185, 129, 0.35)"
                        : "var(--border)",
                      boxShadow: androidEnabled
                        ? "0 2px 10px rgba(16, 185, 129, 0.08)"
                        : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xs"
                      style={{
                        width: "30px",
                        height: "30px",
                        background: androidEnabled
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(100, 116, 139, 0.12)",
                        color: androidEnabled ? "#10B981" : "var(--text-muted)",
                      }}
                    >
                      <Smartphone size={17} />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary">
                          Android App
                        </span>
                        <span
                          className="font-extrabold text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: androidEnabled
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            color: androidEnabled ? "#10B981" : "#EF4444",
                          }}
                        >
                          {androidEnabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <span
                        className="text-muted"
                        style={{ fontSize: "11px" }}
                      >
                        {androidEnabled
                          ? "Visible in Vendor app"
                          : "Hidden in Vendor app"}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isAndroidToggling}
                      onClick={() => handleToggle(flag, "android")}
                      className="relative border-0 ml-1.5 cursor-pointer"
                      style={{
                        width: "50px",
                        height: "28px",
                        borderRadius: "14px",
                        background: androidEnabled ? "#10B981" : "var(--border)",
                        cursor: isAndroidToggling ? "wait" : "pointer",
                        transition: "background 0.25s ease",
                        padding: "2px",
                        outline: "none",
                        boxShadow: androidEnabled
                          ? "0 2px 8px rgba(16, 185, 129, 0.35)"
                          : "none",
                      }}
                      title="Toggle Android App vendor wallet"
                    >
                      <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: "24px",
                          height: "24px",
                          background: "#fff",
                          transform: androidEnabled
                            ? "translateX(22px)"
                            : "translateX(0px)",
                          transition:
                            "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        {isAndroidToggling ? (
                          <RefreshCw
                            size={11}
                            color="#10B981"
                            className="animate-spin"
                          />
                        ) : androidEnabled ? (
                          <CheckCircle2 size={13} color="#10B981" />
                        ) : (
                          <XCircle size={13} color="#9CA3AF" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Web Portal Toggle Card */}
                  <div
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-md border"
                    style={{
                      background: "var(--bg-surface-elevated)",
                      borderColor: webEnabled
                        ? "rgba(16, 185, 129, 0.35)"
                        : "var(--border)",
                      boxShadow: webEnabled
                        ? "0 2px 10px rgba(16, 185, 129, 0.08)"
                        : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xs"
                      style={{
                        width: "30px",
                        height: "30px",
                        background: webEnabled
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(100, 116, 139, 0.12)",
                        color: webEnabled ? "#10B981" : "var(--text-muted)",
                      }}
                    >
                      <Globe size={17} />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary">
                          Web Portal
                        </span>
                        <span
                          className="font-extrabold text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: webEnabled
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            color: webEnabled ? "#10B981" : "#EF4444",
                          }}
                        >
                          {webEnabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <span
                        className="text-muted"
                        style={{ fontSize: "11px" }}
                      >
                        {webEnabled
                          ? "Visible in Web Portal"
                          : "Hidden in Web Portal"}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isWebToggling}
                      onClick={() => handleToggle(flag, "web")}
                      className="relative border-0 ml-1.5 cursor-pointer"
                      style={{
                        width: "50px",
                        height: "28px",
                        borderRadius: "14px",
                        background: webEnabled ? "#10B981" : "var(--border)",
                        cursor: isWebToggling ? "wait" : "pointer",
                        transition: "background 0.25s ease",
                        padding: "2px",
                        outline: "none",
                        boxShadow: webEnabled
                          ? "0 2px 8px rgba(16, 185, 129, 0.35)"
                          : "none",
                      }}
                      title="Toggle Web Portal vendor wallet"
                    >
                      <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: "24px",
                          height: "24px",
                          background: "#fff",
                          transform: webEnabled
                            ? "translateX(22px)"
                            : "translateX(0px)",
                          transition:
                            "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        {isWebToggling ? (
                          <RefreshCw
                            size={11}
                            color="#10B981"
                            className="animate-spin"
                          />
                        ) : webEnabled ? (
                          <CheckCircle2 size={13} color="#10B981" />
                        ) : (
                          <XCircle size={13} color="#9CA3AF" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div
                      className="text-sm font-extrabold uppercase"
                      style={{
                        color: flag.isEnabled ? "#10B981" : "#EF4444",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {flag.isEnabled ? "Active (Live)" : "Disabled"}
                    </div>
                    <div className="text-muted text-micro">
                      {flag.isEnabled
                        ? "Visible in Vendor app"
                        : "Hidden from Vendor app"}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(flag)}
                    className="relative border-0"
                    style={{
                      width: "56px",
                      height: "30px",
                      borderRadius: "15px",
                      background: flag.isEnabled ? "#10B981" : "var(--border)",
                      cursor: isToggling ? "wait" : "pointer",
                      transition: "background 0.25s ease",
                      padding: "2px",
                      outline: "none",
                      boxShadow: flag.isEnabled
                        ? "0 2px 8px rgba(16, 185, 129, 0.35)"
                        : "none",
                    }}
                  >
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: "26px",
                        height: "26px",
                        background: "#fff",
                        transform: flag.isEnabled
                          ? "translateX(26px)"
                          : "translateX(0px)",
                        transition:
                          "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      {isToggling ? (
                        <RefreshCw
                          size={12}
                          color="var(--brand-indigo-bright-text)"
                          className="animate-spin"
                        />
                      ) : flag.isEnabled ? (
                        <CheckCircle2 size={13} color="#10B981" />
                      ) : (
                        <XCircle size={13} color="#9CA3AF" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredFlags.length === 0 && !loading && (
          <div
            className="p-12 text-center bg-card rounded-md text-muted"
            style={{ border: "1px dashed var(--border)" }}
          >
            <Sliders
              size={32}
              style={{ margin: "0 auto 0.75rem auto", opacity: 0.5 }}
            />
            <div
              className="font-bold text-primary"
              style={{ fontSize: "0.95rem" }}
            >
              No Feature Flags Found
            </div>
            <div className="mt-1 text-body-sm">
              Try adjusting your search criteria or create a new feature flag.
            </div>
          </div>
        )}
      </div>

      {/* Drawer: Create Feature Flag */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Feature Flag"
        subtitle="Create an authoritative dynamic toggle persisted in PostgreSQL."
        width="min(94vw, 500px)"
        footer={
          <div className="flex gap-3 w-full justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={creating}
              onClick={handleCreateFlag}
            >
              Create Flag
            </Button>
          </div>
        }
      >
        <Form
          onSubmit={handleCreateFlag}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div>
            <label className="text-sm font-bold text-secondary">
              Unique Flag Key <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. corporate_auto_dispatch"
              value={newKey}
              onChange={(e) =>
                setNewKey(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                )
              }
              required
              className="w-full py-2 px-3 rounded-sm border bg-card text-primary text-mono mt-tight text-body"
            />
            <div className="text-muted mt-1 text-micro">
              Lowercase alphanumeric, hyphens, and underscores only.
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-secondary">
              Display Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Corporate Auto Dispatch System"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-sm border bg-card text-primary mt-tight text-body"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-secondary">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full py-2 px-3 rounded-sm border bg-card text-primary mt-tight text-body"
            >
              <option value="PAYMENTS">PAYMENTS</option>
              <option value="FLEET">FLEET</option>
              <option value="TRIPS">TRIPS</option>
              <option value="DISPATCH">DISPATCH</option>
              <option value="CORPORATE">CORPORATE</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-secondary">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Explain what this feature flag controls and its operational impact..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full py-2 px-3 rounded-sm border bg-card text-primary mt-tight text-body"
              style={{ resize: "vertical" }}
            />
          </div>

          <div
            className="bg-surface-elevated rounded-sm border flex justify-between items-center"
            style={{ padding: "0.85rem" }}
          >
            <div>
              <div className="font-bold text-primary text-body-md">
                Initial State
              </div>
              <div className="text-muted text-label">
                {newIsEnabled
                  ? "Enabled immediately across all apps upon creation"
                  : "Disabled initially upon creation"}
              </div>
            </div>
            <label className="flex items-center cursor-pointer gap-snug">
              <input
                type="checkbox"
                checked={newIsEnabled}
                onChange={(e) => setNewIsEnabled(e.target.checked)}
              />
              <span
                className="font-semibold text-body-sm"
                style={{
                  color: newIsEnabled ? "#10B981" : "var(--text-secondary)",
                }}
              >
                {newIsEnabled ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
