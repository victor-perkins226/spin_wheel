// components/LanguageDropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  // add more as needed
];

export default function LanguageDropdown() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(LANGUAGES[0]);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-2 px-4 py-2 glass border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <span className="text-gray-700 dark:text-gray-200 font-medium">
          {current.label}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform ${open ? "rotate-180" : ""}`} 
        />
      </button>

      {open && (
        <ul className="absolute right-0 mt-2 w-40 glass border-gray-200  rounded-lg shadow-lg overflow-hidden z-[1000000]">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                onClick={() => {
                  setCurrent(lang);
                  setOpen(false);
                  // you could also call i18n.changeLanguage(lang.code) here
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
