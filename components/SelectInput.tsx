// components/SelectInput.tsx
"use client";

import { useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useTheme } from "next-themes";

export interface SelectInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export default function SelectInput({
  label,
  value,
  onChange,
  placeholder = "Search address",
  className,
  onKeyDown,
}: SelectInputProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  // autofocus when mounted
  useEffect(() => {
    ref.current?.querySelector("input")?.focus();
  }, []);

  return (
    <div className={`w-full max-w-[340px] ${className || ""}`}>
      {label && (
        <label className="block mb-1 text-sm font-medium">
          {label}
        </label>
      )}
      <div ref={ref} className="relative inline-block w-full">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`
            pl-4 pr-4 py-2 w-full
            glass border border-gray-200 dark:border-gray-700
            rounded-lg shadow-sm
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-400
            transition
          `}
        />
      </div>
    </div>
  );
}
