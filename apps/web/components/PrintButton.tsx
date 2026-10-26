// apps/web/components/PrintButton.tsx
"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hover:text-accent transition-colors"
    >
      Print / Save as PDF
    </button>
  );
}