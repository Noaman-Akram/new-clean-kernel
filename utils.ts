export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
};

export const getTodayKey = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Simulated Prayer Times for Cairo (Approximation for demo reliability)
// In a real localized version, we'd use coordinates. 
// Standardized rough times for Cairo.
export const getNextPrayer = () => {
  const now = new Date();
  const times = [
    { name: 'Fajr', hour: 4, minute: 30 },
    { name: 'Dhuhr', hour: 11, minute: 50 },
    { name: 'Asr', hour: 14, minute: 45 },
    { name: 'Maghrib', hour: 17, minute: 15 },
    { name: 'Isha', hour: 18, minute: 45 },
  ];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const t of times) {
    const tMinutes = t.hour * 60 + t.minute;
    if (tMinutes > currentMinutes) {
      return { name: t.name, time: `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}`, remaining: tMinutes - currentMinutes };
    }
  }
  
  // If passed Isha, next is Fajr tomorrow
  return { name: 'Fajr', time: '04:30', remaining: (24 * 60 + 270) - currentMinutes };
};