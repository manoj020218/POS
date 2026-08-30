import { useEffect, useState } from 'react';

const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });

export const LiveClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000 * 15);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="text-right leading-tight">
      <p className="text-lg font-bold text-ink">{timeFormatter.format(now)}</p>
      <p className="text-xs font-medium text-ink-faint">{dateFormatter.format(now)}</p>
    </div>
  );
};
