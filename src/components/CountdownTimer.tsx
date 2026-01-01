import { useState, useEffect } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

const getNextSunday = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo
  
  // Se for domingo e antes das 23:59, conta até hoje
  // Senão, conta até o próximo domingo
  const daysUntilSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
  
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999); // 23:59 de domingo
  
  return nextSunday;
};

const calculateTimeLeft = (): TimeLeft => {
  const now = new Date();
  const target = getNextSunday();
  const difference = target.getTime() - now.getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
  };
};

interface CountdownTimerProps {
  variant?: "hero" | "section";
}

const CountdownTimer = ({ variant = "section" }: CountdownTimerProps) => {
  // Use lazy initial state to avoid hydration mismatch
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(timer);
  }, []);

  // Fixed dimensions to prevent CLS
  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[40px] sm:min-w-[48px]">
      <span className={`font-bold tabular-nums ${variant === "hero" ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl"} text-foreground`}>
        {isMounted ? value.toString().padStart(2, "0") : "--"}
      </span>
      <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
      <TimeBlock value={timeLeft.days} label="dias" />
      <span className="text-lg sm:text-xl text-muted-foreground">:</span>
      <TimeBlock value={timeLeft.hours} label="hrs" />
      <span className="text-lg sm:text-xl text-muted-foreground">:</span>
      <TimeBlock value={timeLeft.minutes} label="min" />
    </div>
  );
};

export default CountdownTimer;
