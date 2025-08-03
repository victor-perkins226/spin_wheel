// components/SocialDropdown.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { FaReddit, FaFacebook, FaTelegram, FaDiscord, FaTwitter, FaGlobe } from "react-icons/fa";
import { useTheme } from "next-themes";

const SOCIALS = [
  { name: "Reddit",   icon: FaReddit,   url: "https://www.reddit.com" },
  { name: "X",        icon: FaTwitter,  url: "https://twitter.com" },
  { name: "Facebook", icon: FaFacebook, url: "https://www.facebook.com" },
  { name: "Telegram", icon: FaTelegram, url: "https://telegram.org" },
  { name: "Discord",  icon: FaDiscord,  url: "https://discord.com" },
];

export default function SocialDropdown() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center space-x-2 px-4 py-2 cursor-pointer glass border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <span className="font-medium">Socials</span>
        <ChevronDown
          className={`w-4 h-4 transform transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
           className={`
            absolute right-0 mt-2 w-40 p-2
            ${theme === "dark"
              ? "!bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
              : "!bg-white"} 
            glass border border-gray-200 dark:border-gray-700 
            rounded-xl shadow-lg z-[100]
          `}
        >
          {SOCIALS.map(s => {
            const ItemIcon = s.icon;
            return (
              <li key={s.name}>
                <button
                  type="button"
                  onClick={() => window.open(s.url, "_blank")}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-xs cursor-pointer hover:bg-gray-200/50 hover:rounded transition"
                >
                  <ItemIcon className="w-5 h-5" />
                  <span>{s.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
