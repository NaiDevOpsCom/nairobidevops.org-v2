import { useMemo, type ComponentType } from "react";
import CountUpImport, { type CountUpProps } from "react-countup";
import { useInView } from "react-intersection-observer";

type CountUpRuntimeExport = ComponentType<CountUpProps> & {
  default?: ComponentType<CountUpProps>;
};

const countUpRuntime: CountUpRuntimeExport = CountUpImport;
const CountUp = countUpRuntime.default ?? countUpRuntime;

interface StatisticCounterProps {
  endValue: string | number;
  duration?: number;
  className?: string;
}

const StatisticCounter = ({
  endValue,
  duration = 2,
  className = "text-2xl font-bold text-foreground",
}: StatisticCounterProps) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { numericValue, prefix, suffix } = useMemo(() => {
    const str = String(endValue);
    // find the first numeric substring (handles decimals and commas)
    const regex = /[-+]?\d[\d,]*\.?\d*/;
    const match = regex.exec(str);
    if (!match) {
      return { numericValue: Number.NaN, prefix: "", suffix: str };
    }
    const numStr = match[0].replaceAll(",", "");
    const prefix = str.slice(0, match.index ?? 0);
    const suffix = str.slice((match.index ?? 0) + match[0].length);
    return {
      numericValue: Number(numStr),
      prefix,
      suffix,
    };
  }, [endValue]);

  // Fallback if the value cannot be parsed
  if (Number.isNaN(numericValue)) {
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
