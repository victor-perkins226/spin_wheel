'use client'
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import SVG from "./svg.component";

type AddressCellProps = {
  address: string;
  isOpen: boolean;
  onToggle: (addr: string) => void;
  onClose: () => void;
  onViewStats: () => void;
  onViewExplorer: () => void;
};

export default function AddressCell({
  address,
  isOpen,
  onToggle,
  onClose,
  onViewStats,
  onViewExplorer,
}: AddressCellProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // close when you click outside this wrapper
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const shortAddr = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const { theme } = useTheme();
  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        onClick={() => onToggle(address)}
        className="flex items-center gap-[6px] font-semibold cursor-pointer"
      >
        <SVG iconName="avatar" width={16} height={16} />
        {shortAddr}
      </button>

      {isOpen && (
        <div
          className={`
           absolute left-0 top-full mt-2 w-40 rounded-md shadow-lg z-20
      ${
        theme === "dark"
          ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
          : "bg-white"
      }
      border border-gray-200 dark:border-gray-700
   r
          `}
        >
          <button
            onClick={() => {
                console.log("View Stats clicked");
              
              onClose();
              onViewStats();
            }}
            className={`
        block w-full text-left px-4 py-2 text-sm cursor-pointer
        ${theme === "dark" ? "hover:bg-white/50" : "hover:bg-gray-300"}`}
          >
            View Stats
          </button>
          <button
            onClick={() => {
              onClose();
            onViewExplorer();
             
            }}
            className={`
        block w-full text-left px-4 py-2 text-sm cursor-pointer
        ${theme === "dark" ? "hover:bg-white/50" : "hover:bg-gray-300"}`}
          >
            View on Explorer
          </button>
        </div>
      )}
    </div>
  );
}
