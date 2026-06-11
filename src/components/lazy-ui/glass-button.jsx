import React from "react";
import "./glass-button.css";

export function GlassButton({
  children,
  size = "md",
  className = "",
  style,
  ...rest
}) {
  return (
    <button
      type="button"
      className={`glass-btn-element glass-btn-size-${size} ${className}`}
      style={style}
      {...rest}
    >
      <span className="glass-btn-text">
        {children}
      </span>
    </button>
  );
}

GlassButton.displayName = "GlassButton";
