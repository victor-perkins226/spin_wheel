import { motion, MotionConfig } from "motion/react";
import NumberFlow, { useCanAnimate } from "@number-flow/react";
import { ArrowUp } from "lucide-react";

const MotionNumberFlow = motion.create(NumberFlow);
const MotionArrowUp = motion.create(ArrowUp);

export interface ValueBadgeProps {
  /** Positive for up, negative for down, zero for flat */
  value: number;
  /** Whether to show the arrow */
  hasArrow?: boolean;
  /** Background class (e.g. theme-dependent) */
  bgClass?: string;
  /** Intl.NumberFormat options, default: currency USD with 2 fraction digits */
  format?: Intl.NumberFormatOptions & { notation?: "standard" | "compact" };
}

export default function ValueBadge({
  value,
  hasArrow = true,
  bgClass = "",
  format = {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  },
}: ValueBadgeProps) {
  const canAnimate = useCanAnimate();
  const textColor =
    value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-gray-500";

  return (
    <MotionConfig
      transition={{
        layout: canAnimate
          ? { duration: 0.9, bounce: 0, type: "spring" }
          : { duration: 0 },
      }}
    >
      <motion.span
        className={`${bgClass} flex items-center gap-[4px] ${textColor} px-[10px] py-[10px] rounded-[5px]`}
        layout
      >
        {hasArrow && (
          <MotionArrowUp
            size={12}
            absoluteStrokeWidth
            strokeWidth={3}
            layout
            transition={{
              rotate: canAnimate
                ? { type: "spring", duration: 0.5, bounce: 0 }
                : { duration: 0 },
            }}
            animate={{ rotate: value >= 0 ? 0 : -180 }}
            initial={false}
          />
        )}

        <MotionNumberFlow
          value={Math.abs(value)}
          className="text-[12px] font-semibold"
          format={format}
          layout
          layoutRoot
        />
      </motion.span>
    </MotionConfig>
  );
}
