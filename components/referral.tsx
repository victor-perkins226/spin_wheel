import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import React, { useState } from "react";
import { useTranslation } from "next-i18next";
import {
  FaTelegramPlane,
  FaTwitter,
  FaInstagram,
  FaDiscord,
} from "react-icons/fa";


export default function Referral() {
  const { t } = useTranslation("common");

  const [selected, setSelected] = useState("telegram");
  const [otherSource, setOtherSource] = useState("");

  const options = [
  { label: "Telegram", value: "telegram", Icon: FaTelegramPlane },
  { label: "Twitter", value: "twitter", Icon: FaTwitter },
  { label: "Instagram", value: "instagram", Icon: FaInstagram },
  { label: "Discord", value: "discord", Icon: FaDiscord },
  { label: (<>{t('referral.others')}</>), value: "others", Icon: null },
];
  const handleSubmit = () => {
    // TODO: wire this up to your API or form handler
    console.log({ selected, otherSource });
  };
  return (
    <div className="glass rounded-3xl max-w-[1300px]  mx-auto mt-8">
      <div className="max-w-2xl mx-auto p-10 rounded-xl ">
        <h2 className="text-3xl pt-8 font-semibold">
         {t('referral.discover')}
        </h2>
        <p className=" mt-2">{t('referral.curious')}</p>

        <div className="mt-6 space-y-4">
          {options.map(({ label, value, Icon }) => (
            <label
              key={value}
              className={`flex items-center p-4 hover:border-gray-400 hover:bg-gray-100/10 rounded-lg border transition-colors cursor-pointer
              ${
                selected === value
                  ? "0 border-blue-500 ring-1 ring-blue-500 bg-gray-200/10"
                  : "border-transparent hover:border-gray-600"
              }`}
            >
              <input
                type="radio"
                name="discover"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className="sr-only"
              />
              {Icon ? (
                <Icon className="text-xl mr-3" />
              ) : (
                <span className="w-6 h-6 mr-3 flex items-center justify-center text-sm  rounded-full">
                  ?
                </span>
              )}
              <span className="text-lg">{label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Please input other sources here"
            value={otherSource}
            onChange={(e) => setOtherSource(e.target.value)}
            disabled={selected !== "others"}
            className={`w-full p-3 rounded-2xl placeholder-gray-400 border-transparent
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
            ${
              selected !== "others"
                ? "opacity-50 cursor-not-allowed "
                : "bg-gray-200/10"
            }`}
          />
        </div>
         <div className="mt-6 text-right">
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-3 glass cursor-pointer hover:!bg-gray-100/40 text-white rounded-2xl font-semibold transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
