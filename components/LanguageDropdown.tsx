"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";

const LANGUAGES = [
  { code: "ar", label: "Arabic", countryCode: "SA" }, // Saudi Arabia
  { code: "bn", label: "Bengali", countryCode: "BD" }, // Bangladesh
  { code: "en", label: "English", countryCode: "GB" }, // United Kingdom (Union Jack)
  { code: "fr", label: "French", countryCode: "FR" }, // France
  { code: "de", label: "German", countryCode: "DE" }, // Germany
  { code: "hi", label: "Hindi", countryCode: "IN" }, // India
  { code: "it", label: "Italian", countryCode: "IT" }, // Italy
  { code: "ja", label: "Japanese", countryCode: "JP" }, // Japan
  { code: "jv", label: "Javanese", countryCode: "ID" }, // Indonesia
  { code: "ko", label: "Korean", countryCode: "KR" }, // South Korea
  { code: "mr", label: "Marathi", countryCode: "IN" }, // India
  { code: "pt", label: "Portuguese", countryCode: "PT" }, // Portugal
  { code: "ru", label: "Russian", countryCode: "RU" }, // Russia
  { code: "es", label: "Spanish", countryCode: "ES" }, // Spain
  { code: "sw", label: "Swahili", countryCode: "KE" }, // Kenya
  { code: "ta", label: "Tamil", countryCode: "LK" }, // Sri Lanka
  { code: "te", label: "Telugu", countryCode: "IN" }, // India
  { code: "tr", label: "Turkish", countryCode: "TR" }, // Turkey
  { code: "ur", label: "Urdu", countryCode: "PK" }, // Pakistan
];

export default function LanguageDropdown() {

  const router = useRouter();
  const { locale, asPath } = router;
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() =>
    LANGUAGES.find((lang) => lang.code === locale) || LANGUAGES[0]
  );

  useEffect(() => {
    setCurrent(LANGUAGES.find((lang) => lang.code === locale) || LANGUAGES[0]);
  }, [locale]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSwitch = (langCode: string) => {
    setOpen(false);
    router.push(asPath, asPath, { locale: langCode });
  };

  const ref = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();
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
        <ul
          className={`${
            theme === "dark"
              ? "!bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
              : "!bg-white shadow-lg"
          } absolute p-2 glass  right-0 mt-2 w-40 border rounded-xl border-gray-200 shadow-lg overflow-hidden z-[100]`}
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                 onClick={() => handleLanguageSwitch(lang.code)}
                className="w-full flex items-center px-4 py-2 cursor-pointer text-xs hover:bg-gray-200/50 hover:rounded   transition"
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
