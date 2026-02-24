import { useMemo } from "react";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";

interface StatisticCounterProps {
  endValue: string | number;
  duration?: number;
  className?: string;
}

const StatisticCounter = ({
  endValue,
  duration = 2.0,
  className = "text-2xl font-bold text-foreground",
}: StatisticCounterProps) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { numericValue, prefix, suffix } = useMemo(() => {
    const str = String(endValue);
    // find the first numeric substring (handles decimals and commas)
    const match = str.match(/[-+]?\d[\d,]*\.?\d*/);
    if (!match) {
      return { numericValue: NaN, prefix: "", suffix: str };
    }
    const numStr = match[0].replace(/,/g, "");
    const prefix = str.slice(0, match.index ?? 0);
    const suffix = str.slice((match.index ?? 0) + match[0].length);
    return {
      numericValue: Number(numStr),
      prefix,
      suffix,
    };
  }, [endValue]);

  // Fallback if the value cannot be parsed
  if (isNaN(numericValue)) {
    return <span className={className}>{String(endValue)}</span>;
  }

  return (
    <span ref={ref} className={className} aria-live="polite">
      {prefix}
      {inView ? <CountUp start={0} end={numericValue} duration={duration} /> : "0"}
      {suffix}
    </span>
  );
};

export default StatisticCounter;
