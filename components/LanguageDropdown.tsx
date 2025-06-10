"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

const LANGUAGES = [
  { code: "ar", label: "Arabic",    countryCode: "SA" }, // Saudi Arabia
  { code: "bn", label: "Bengali",   countryCode: "BD" }, // Bangladesh
  { code: "en", label: "English",   countryCode: "GB" }, // United Kingdom (Union Jack)
  { code: "fr", label: "French",    countryCode: "FR" }, // France
  { code: "de", label: "German",    countryCode: "DE" }, // Germany
  { code: "hi", label: "Hindi",     countryCode: "IN" }, // India
  { code: "it", label: "Italian",   countryCode: "IT" }, // Italy
  { code: "ja", label: "Japanese",  countryCode: "JP" }, // Japan
  { code: "jv", label: "Javanese",  countryCode: "ID" }, // Indonesia
  { code: "ko", label: "Korean",    countryCode: "KR" }, // South Korea
  { code: "mr", label: "Marathi",   countryCode: "IN" }, // India
  { code: "pt", label: "Portuguese",countryCode: "PT" }, // Portugal
  { code: "ru", label: "Russian",   countryCode: "RU" }, // Russia
  { code: "es", label: "Spanish",   countryCode: "ES" }, // Spain
  { code: "sw", label: "Swahili",   countryCode: "KE" }, // Kenya
  { code: "ta", label: "Tamil",     countryCode: "LK" }, // Sri Lanka
  { code: "te", label: "Telugu",    countryCode: "IN" }, // India
  { code: "tr", label: "Turkish",   countryCode: "TR" }, // Turkey
  { code: "ur", label: "Urdu",      countryCode: "PK" }, // Pakistan
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
        className="flex items-center space-x-2 px-4 py-2 cursor-pointer glass border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <Globe className="w-5 h-5" />
        <ReactCountryFlag
          countryCode={current.countryCode}
          svg
          className="w-5 h-5"
          style={{ lineHeight: "1em" }}
          aria-label={current.label}
        />
        <span className="font-medium">{current.label}</span>
        <ChevronDown
          className={`w-4 h-4 transform transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul className="absolute right-0 mt-2 w-40 glass border rounded-xl border-gray-200 backdrop-blur-[40px] drop-shadow-[#0000001A] shadow-lg overflow-hidden z-[100]">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                onClick={() => {
                  setCurrent(lang);
                  setOpen(false);
                  // i18n.changeLanguage(lang.code);
                }}
                className="w-full flex items-center px-4 py-2  backdrop-blur-[40px] glass hover:backdrop-blur-3xl hover:shadow-sm cursor-pointer  transition"
              >
                <ReactCountryFlag
                  countryCode={lang.countryCode}
                  svg
                  className="w-5 h-5 mr-2"
                  style={{ lineHeight: "1em" }}
                  aria-label={lang.label}
                />
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
