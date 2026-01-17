export const DAILY_QUOTES = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "It does not matter how slowly you go as long as you do not stop. - Confucius",
  "Everything you’ve ever wanted is on the other side of fear. - George Addair",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "Hardships often prepare ordinary people for an extraordinary destiny. - C.S. Lewis",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "The future depends on what you do today. - Mahatma Gandhi",
  "Do what you can, with what you have, where you are. - Theodore Roosevelt",
  "It always seems impossible until it's done. - Nelson Mandela",
  "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
  "Dream big and dare to fail. - Norman Vaughan",
  "You are never too old to set another goal or to dream a new dream. - C.S. Lewis",
  "Action is the foundational key to all success. - Pablo Picasso",
  "We become what we think about. - Earl Nightingale",
  "The mind is everything. What you think you become. - Buddha"
];

export const getQuoteForDate = (date: Date): string => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
};
