import { useState, useEffect } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

const getNextMonday = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(8, 0, 0, 0); // 8h da manhã
  
  return nextMonday;
};

const calculateTimeLeft = (): TimeLeft => {
  const now = new Date();
  const target = getNextMonday();
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
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(timer);
  }, []);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className={`font-bold ${variant === "hero" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} text-foreground`}>
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-3 md:gap-4">
      <TimeBlock value={timeLeft.days} label="dias" />
      <span className="text-xl text-muted-foreground">:</span>
      <TimeBlock value={timeLeft.hours} label="hrs" />
      <span className="text-xl text-muted-foreground">:</span>
      <TimeBlock value={timeLeft.minutes} label="min" />
    </div>
  );
};

export default CountdownTimer;
