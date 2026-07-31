import { useEffect, useRef, useState } from 'react';

/**
 * Saniye bazlı geri sayım. Kod yeniden gönderme butonunu kilitlemek için
 * kullanılır; sunucudan gelen `retryAfterSeconds` değeriyle başlatılır.
 */
export function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (seconds <= 0) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    if (timer.current) return;
    timer.current = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          if (timer.current) {
            clearInterval(timer.current);
            timer.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [seconds]);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  return { seconds, start: setSeconds };
}

/** 125 → "2:05" */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
