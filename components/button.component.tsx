import React, { ComponentPropsWithoutRef, ReactNode } from "react";

interface IProps extends ComponentPropsWithoutRef<"button"> {
  children: ReactNode;
}

export default function Button({ children, style, ...restProps }: IProps) {
  return (
    <button
      style={{
        background: "linear-gradient(90deg, #D57F07 0%, #965E27 100%)",
        ...style,
      }}
      {...restProps}
      className={`font-semibold text-[16px] py-[13px] px-[21px] rounded-[60px] ${
        restProps.className ?? ""
      }`}
    >
      {children}
    </button>
  );
}
