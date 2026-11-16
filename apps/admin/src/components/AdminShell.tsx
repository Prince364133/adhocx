"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ToastProvider } from "./common/ToastProvider";
import { AdhocxBrandLogo } from "./AdhocxBrandLogo";
import {
  adminApi,
  getStoredAdminToken,
  clearAdminSession,
} from "../lib/api/client";
import { Loader2 } from "lucide-react";

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const [isVerifying, setIsVerifying] = useState(!isLoginPage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const retryVerification = () => {
    setErrorMessage(null);
    setIsVerifying(true);
    checkSession();
  };

  const handleGoToLogin = () => {
    clearAdminSession();
    window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
  };

  async function checkSession() {
    const token = getStoredAdminToken();
    if (!token) {
      clearAdminSession();
      const redirect = encodeURIComponent(pathname);
      window.location.replace(`/login?redirect=${redirect}`);
      return;
    }

    try {
      await adminApi.verifyAdminSession();
      setIsVerifying(false);
      setErrorMessage(null);
    } catch {
      clearAdminSession();
      const redirect = encodeURIComponent(pathname);
      window.location.replace(`/login?redirect=${redirect}`);
    }
  }

  useEffect(() => {
    // If on the login page, no shell authentication verification is needed
    if (isLoginPage) {
      setIsVerifying(false);
      return;
    }

    checkSession();

    // Safety timeout to prevent getting permanently stuck if backend is slow
    const timeout = setTimeout(() => {
      setIsVerifying((prev) => {
        if (prev) {
          setErrorMessage(
            "Session verification is taking longer than expected. The API server may be restarting or unreachable.",
          );
        }
        return prev;
      });
    }, 4500);

    return () => {
      clearTimeout(timeout);
    };
  }, [pathname, isLoginPage]);

  // If on login route, render standalone login screen without sidebar & header
  if (isLoginPage) {
    return <>{children}</>;
  }

  // When verifying protected routes, show secure loading gate to prevent UI flashing
  if (isVerifying) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-5 bg-base text-primary p-6"
        style={{ minHeight: "100vh" }}
      >
        <div style={{ transform: "scale(1.1)" }}>
          <AdhocxBrandLogo size={44} subtitle="Control Portal" />
        </div>

        {!errorMessage ? (
          <div
            className="flex items-center bg-surface rounded-full border shadow-sm text-body text-secondary font-semibold"
            style={{ gap: "0.65rem", padding: "0.6rem 1.2rem" }}
          >
            <Loader2
              size={16}
              className="spin-animation"
              color="var(--text-brand)"
            />
            <span>Verifying Server Administrative Session...</span>
          </div>
        ) : (
          <div
            className="text-center bg-surface p-6 border"
            style={{
              maxWidth: "420px",
              borderRadius: "12px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <p
              className="mt-0 mr-0 mb-4 ml-0 text-body-xl text-secondary"
              style={{ lineHeight: 1.5 }}
            >
              {errorMessage}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="font-semibold text-body border-0 cursor-pointer"
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  backgroundColor: "var(--brand-primary)",
                  color: "#ffffff",
                }}
              >
                Sign In to Admin
              </button>
              <button
                type="button"
                onClick={retryVerification}
                className="bg-transparent text-primary font-semibold text-body border cursor-pointer"
                style={{ padding: "0.55rem 1rem", borderRadius: "8px" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Authenticated layout with Sidebar & Header
  return (
    <ToastProvider>
      <div className="admin-layout">
        <Sidebar />
        <div className="admin-main">
          <Header />
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
};
