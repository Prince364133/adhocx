import React from "react";

interface AdhocxBrandLogoProps {
  variant?: "full" | "icon";
  size?: number;
  subtitle?: string;
  className?: string;
}

export const AdhocxBrandIcon: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 36, className = "" }) => {
  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "9px",
        background: "linear-gradient(135deg, #5728B2 0%, #431E8E 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: `${size * 0.44}px`,
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 3px 10px rgba(87, 40, 178, 0.25)",
        flexShrink: 0,
        color: "#FFFFFF",
      }}
    >
      <span>A</span>
      <span style={{ color: "#FF5F09" }}>X</span>
    </div>
  );
};

export const AdhocxBrandLogo: React.FC<AdhocxBrandLogoProps> = ({
  variant = "full",
  size = 36,
  subtitle = "Control Portal",
  className = "",
}) => {
  if (variant === "icon") {
    return <AdhocxBrandIcon size={size} className={className} />;
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        className="font-black flex items-center"
        style={{
          fontSize: `${(size / 36) * 1.55}rem`,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        <span className="text-primary">Adhoc</span>
        <span className="font-black" style={{ color: "#FF5F09" }}>
          X
        </span>
      </div>
      {subtitle && (
        <div
          className="text-muted uppercase font-bold mt-1"
          style={{
            fontSize: `${(size / 36) * 0.65}rem`,
            letterSpacing: "0.14em",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
