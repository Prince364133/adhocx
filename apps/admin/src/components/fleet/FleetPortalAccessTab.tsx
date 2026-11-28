"use client";

import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Shield, UserPlus } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import type { AdminFleetPortalUserItem } from "../../lib/api/types";
import { Button, StatusBadge } from "../common";

interface Props {
  fleetId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  onNotify: (type: "success" | "error", message: string) => void;
}

export const FleetPortalAccessTab: React.FC<Props> = ({
  fleetId,
  ownerName,
  ownerPhone,
  ownerEmail,
  onNotify,
}) => {
  const [users, setUsers] = useState<AdminFleetPortalUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(ownerName);
  const [phone, setPhone] = useState(ownerPhone);
  const [email, setEmail] = useState(ownerEmail || "");
  const [role, setRole] = useState<"FLEET_OWNER" | "FLEET_MANAGER">("FLEET_OWNER");
  const [password, setPassword] = useState("");

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminApi.listFleetPortalUsers(fleetId);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      onNotify(
        "error",
        err instanceof Error ? err.message : "Failed to load Fleet Portal users.",
      );
    } finally {
      setLoading(false);
    }
  }, [fleetId, onNotify]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || password.trim().length < 8) {
      onNotify("error", "Name, valid phone, and password (min 8 chars) are required.");
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createFleetPortalUser(fleetId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        role,
        password: password.trim(),
      });
      setShowForm(false);
      setPassword("");
      onNotify("success", "Fleet Portal account provisioned.");
      await loadUsers();
    } catch (err: unknown) {
      onNotify(
        "error",
        err instanceof Error ? err.message : "Failed to create portal user.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AdminFleetPortalUserItem) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingId(user.id);
    try {
      await adminApi.updateFleetPortalUser(fleetId, user.id, { status: nextStatus });
      onNotify(
        "success",
        `Portal user "${user.fullName}" marked ${nextStatus}.`,
      );
      await loadUsers();
    } catch (err: unknown) {
      onNotify(
        "error",
        err instanceof Error ? err.message : "Failed to update user status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (resetPassword.trim().length < 8) {
      onNotify("error", "New password must be at least 8 characters.");
      return;
    }
    setUpdatingId(userId);
    try {
      await adminApi.updateFleetPortalUser(fleetId, userId, {
        password: resetPassword.trim(),
      });
      setResetTargetId(null);
      setResetPassword("");
      onNotify("success", "Portal user password updated.");
    } catch (err: unknown) {
      onNotify(
        "error",
        err instanceof Error ? err.message : "Failed to reset password.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
          <Shield size={14} /> Portal Admin Accounts ({users.length})
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (!showForm && users.length > 0) {
              setRole("FLEET_MANAGER");
              setFullName("");
              setPhone("");
              setEmail("");
            } else if (!showForm) {
              setRole("FLEET_OWNER");
              setFullName(ownerName);
              setPhone(ownerPhone);
              setEmail(ownerEmail || "");
            }
            setShowForm((prev) => !prev);
          }}
        >
          <UserPlus size={13} style={{ marginRight: "4px" }} />
          {showForm ? "Cancel" : "Provision User"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateUser}
          style={{
            padding: "14px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input
              type="text"
              placeholder="Full Name *"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
            />
            <input
              type="tel"
              placeholder="Phone (+91...) *"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "FLEET_OWNER" | "FLEET_MANAGER")}
              className="form-input"
            >
              <option value="FLEET_OWNER">FLEET_OWNER (Full Control)</option>
              <option value="FLEET_MANAGER">FLEET_MANAGER (Operations)</option>
            </select>
          </div>
          <input
            type="password"
            placeholder="Initial Password (min 8 chars) *"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Create Portal Credentials
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading Portal users...
        </div>
      ) : users.length === 0 ? (
        <div
          style={{
            padding: "28px",
            textAlign: "center",
            color: "var(--text-muted)",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "8px",
          }}
        >
          No Fleet Portal users have been provisioned yet. Click &quot;Provision User&quot; to grant Fleet Owner login access.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-primary)" }}>
                    {u.fullName} · <span style={{ fontSize: "11.5px", color: "var(--brand-primary)" }}>{u.role}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {u.phone} {u.email ? `· ${u.email}` : ""}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Last login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never signed in"}
                  </div>
                </div>
                <StatusBadge status={u.status} size="sm" />
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={updatingId === u.id}
                  onClick={() => handleToggleStatus(u)}
                >
                  {u.status === "ACTIVE" ? "Deactivate Access" : "Activate Access"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResetTargetId(resetTargetId === u.id ? null : u.id);
                    setResetPassword("");
                  }}
                >
                  <KeyRound size={12} style={{ marginRight: "4px" }} />
                  Reset Password
                </Button>
              </div>

              {resetTargetId === u.id && (
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    minLength={8}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={updatingId === u.id}
                    onClick={() => handleResetPassword(u.id)}
                  >
                    Save Password
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
