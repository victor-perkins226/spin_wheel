// components/SelectBox.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

export interface SelectBoxProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  className?: string;
}

export default function SelectBox({
  label,
  value,
  options,
  onChange,
  className,
}: SelectBoxProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // close when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block text-left ${className || ""}`}>
      {label && <div className="mb-1 text-sm font-medium">{label}</div>}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-2 glass border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <span className="font-medium">{value}</span>
        <ChevronDown
          className={`w-4 h-4 transform transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          className={`absolute right-0 mt-2 w-40 p-1 glass border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[100] ${
            theme === "dark"
              ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
              : "bg-white"
          }`}
        >
          {options.map((opt) => (
            <li key={opt}>
              <button
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-200/50 hover:rounded transition"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
