"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { AdhocxBrandLogo } from "../../components/AdhocxBrandLogo";
import {
  adminApi,
  setAdminSession,
  getStoredAdminToken,
} from "../../lib/api/client";
import { Button, Form, Input } from "../../components/common";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect straight to target
  useEffect(() => {
    const token = getStoredAdminToken();
    if (token) {
      router.replace(redirectUrl);
    }
  }, [router, redirectUrl]);

  const performLogin = async (idVal: string, pwVal: string) => {
    if (!idVal.trim() || !pwVal) {
      setErrorMessage("Please enter both your Admin ID and Password");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await adminApi.loginAdmin({
        identifier: idVal.trim(),
        password: pwVal,
      });

      if (!response || !response.accessToken) {
        throw new Error(
          "Authentication succeeded but no authorization token was received.",
        );
      }

      // Establish secure local session & sync cookie for server-side middleware
      setAdminSession(
        response.accessToken,
        response.user,
        response.refreshToken,
      );

      // Navigate to destination
      router.replace(redirectUrl);
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      const msg = err?.message || "";
      if (
        msg === "Failed to fetch" ||
        err?.name === "TypeError" ||
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError")
      ) {
        setErrorMessage(
          "Unable to reach the API server. Please check your connection.",
        );
      } else if (status === 401) {
        setErrorMessage(
          "Invalid Admin ID or Password. Please check your credentials.",
        );
      } else if (status === 403) {
        setErrorMessage(
          "Access Denied: This account lacks administrative privileges.",
        );
      } else {
        setErrorMessage(
          msg || "Failed to authenticate. Please verify server connectivity.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(identifier, password);
  };

  return (
    <main
      className="flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(var(--brand-accent-rgb), 0.22), rgba(255, 255, 255, 0)), var(--bg-base, #F8FAFC)",
      }}
    >
      {/* Decorative background glow accents */}
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "-150px",
          right: "-100px",
          width: "450px",
          height: "450px",
          background:
            "radial-gradient(circle, rgba(var(--brand-accent-rgb), 0.15) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: "-120px",
          left: "-80px",
          width: "380px",
          height: "380px",
          background:
            "radial-gradient(circle, rgba(255, 98, 0, 0.12) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(40px)",
        }}
      />

      <div
        className="animate-fade-in w-full bg-surface rounded-xl border shadow-elevated relative"
        style={{ maxWidth: "420px", padding: "1.85rem 1.75rem", zIndex: 10 }}
      >
        {/* Header & Logo */}
        <div className="text-center" style={{ marginBottom: "1.45rem" }}>
          <div className="inline-flex justify-center mb-4">
            <AdhocxBrandLogo size={40} subtitle="Control Portal" />
          </div>
          <h1
            className="font-bold text-primary"
            style={{
              fontSize: "1.32rem",
              margin: "0 0 0.35rem 0",
              letterSpacing: "-0.02em",
            }}
          >
            Administrative Sign In
          </h1>
          <p
            className="text-base text-secondary m-0"
            style={{ lineHeight: 1.4 }}
          >
            Enter your authorized administrative ID and password to access
            operations.
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            id="login-error-alert"
            role="alert"
            className="flex items-start mb-6 text-body-lg"
            style={{
              gap: "0.65rem",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md, 8px)",
              background: "var(--color-danger-bg, rgba(220, 38, 38, 0.1))",
              border:
                "1px solid var(--color-danger-border, rgba(220, 38, 38, 0.25))",
              color: "var(--color-danger, #DC2626)",
              lineHeight: 1.45,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <AlertCircle
              size={17}
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <Form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}
        >
          {/* Admin ID / Email */}
          <div>
            <label
              htmlFor="admin-identifier"
              className="block font-bold text-body-sm mb-snug"
              style={{
                color: "var(--text-primary, #0F172A)",
                letterSpacing: "0.01em",
              }}
            >
              Admin ID or Email
            </label>
            <div className="relative">
              <div
                className="absolute center-y flex items-center pointer-events-none top-1/2"
                style={{ left: "0.9rem", color: "var(--text-muted, #94A3B8)" }}
              >
                <Mail size={17} />
              </div>
              <Input
                id="admin-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@adhocx.com or Admin ID"
                required
                disabled={isLoading}
                className="w-full box-border text-body-xl"
                wrapperClassName="m-0"
                style={{
                  padding: "0.75rem 0.9rem 0.75rem 2.5rem",
                  borderRadius: "var(--radius-lg, 10px)",
                  border: "1px solid var(--border, #E2E8F0)",
                  background: "var(--bg-canvas, #F8FAFC)",
                  color: "var(--text-primary, #0F172A)",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(var(--brand-primary-rgb), 0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border, #E2E8F0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <div className="flex justify-between items-center mb-snug">
              <label
                htmlFor="admin-password"
                className="font-bold text-body-sm"
                style={{
                  color: "var(--text-primary, #0F172A)",
                  letterSpacing: "0.01em",
                }}
              >
                Admin Password
              </label>
            </div>
            <div className="relative">
              <div
                className="absolute center-y flex items-center pointer-events-none top-1/2"
                style={{ left: "0.9rem", color: "var(--text-muted, #94A3B8)" }}
              >
                <Lock size={17} />
              </div>
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isLoading}
                className="w-full box-border text-body-xl"
                wrapperClassName="m-0"
                style={{
                  padding: "0.75rem 2.65rem 0.75rem 2.5rem",
                  borderRadius: "var(--radius-lg, 10px)",
                  border: "1px solid var(--border, #E2E8F0)",
                  background: "var(--bg-canvas, #F8FAFC)",
                  color: "var(--text-primary, #0F172A)",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(var(--brand-primary-rgb), 0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border, #E2E8F0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                id="toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute center-y bg-transparent border-0 cursor-pointer p-1 flex items-center right-3 top-1/2"
                style={{ color: "var(--text-muted, #94A3B8)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            id="admin-login-submit-btn"
            disabled={isLoading}
            className="btn btn-primary flex items-center justify-center w-full rounded-md bg-brand text-md font-semibold mt-tight gap-snug"
            style={{
              padding: "0.68rem 1.1rem",
              borderColor: "var(--border-focus)",
              color: "#FFFFFF",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.72 : 1,
              transition:
                "background-color 0.15s ease, transform 0.1s ease, opacity 0.15s ease",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Verifying Server Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Control Portal</span>
                <ArrowRight size={17} />
              </>
            )}
          </Button>
        </Form>

        {/* Security Badge Footer */}
        <div
          className="pt-5 flex items-center justify-center text-sm font-semibold gap-snug"
          style={{
            marginTop: "1.75rem",
            borderTop: "1px solid var(--border, #E2E8F0)",
            color: "var(--text-muted, #94A3B8)",
          }}
        >
          <ShieldCheck size={15} color="#16A34A" />
          <span>Protected Administrative Portal • Server-Side Enforced</span>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{ minHeight: "100vh", background: "var(--bg-base, #F8FAFC)" }}
        />
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
