import React from "react";

export function Counter({ value, format, className }) {
  const displayVal = format ? format(value) : value;
  return <span className={className}>{displayVal}</span>;
}
