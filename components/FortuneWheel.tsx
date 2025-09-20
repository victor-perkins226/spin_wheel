"use client";

import React, { useEffect, useState } from "react";
import FortuneIcon from "@/public/assets/fortune_wheel.png";
import Image from "next/image";
import LuckySpin from "@/components/LuckySpin"; // adjust path
import { X } from "lucide-react";

function FortuneWheel() {
  const [open, setOpen] = useState(false);

  // optional: lock scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div>
        <div className="shadow-[0_4px_24px_-1px_#0000001A] backdrop-blur-[40px] border-solid border-transparent [border-image-source:linear-gradient(237.14deg,_#FFFFFF_-37.78%,_rgba(255,255,255,0)_104.38%)] [border-image-slice:1] bg-[linear-gradient(228.15deg,_rgba(255,255,255,0.2)_-64.71%,_rgba(255,255,255,0.05)_102.6%)] flex gap-4 py-2 flex-col items-center max-w-[20rem] m-8 rounded-3xl overflow-hidden">
          <div className="max-w-[85%] w-full m-2 overflow-hidden">
            <Image src={FortuneIcon} alt="fortune wheel" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-3xl font-semibold text-center px-4">Wheel of Fortune</h2>

          <button
            onClick={() => setOpen(true)}
            className="cursor-pointer text-white bg-[linear-gradient(90deg,_#D57F07_0%,_#965E27_100%)] px-6 py-2 w-[150px] mb-3 rounded-3xl font-semibold"
          >
            Play Now
          </button>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          {/* Modal panel */}
          <div className="relative max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-2xl  shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-4">
              <LuckySpin />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FortuneWheel;
