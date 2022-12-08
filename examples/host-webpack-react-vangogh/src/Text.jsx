import React from "react";

export function Text({ children }) {
  if (!children) return null;
  const { lang, format, text } = children;
  let sanitized = text;
  if (format === "html") {
    const sanitizer = document.createElement("span");
    sanitizer.innerHTML = text;
    sanitized = sanitizer.textContent;
  }
  return <span lang={lang}>{sanitized}</span>;
}
