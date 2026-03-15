export const DAILY_QUOTES = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "It does not matter how slowly you go as long as you do not stop. - Confucius",
  "Everything you've ever wanted is on the other side of fear. - George Addair",
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

// Prophet Muhammad (PBUH) - Hadith & Islamic wisdom quotes
export const PROPHETIC_QUOTES = [
  "The best of people are those who are most beneficial to people. - Prophet Muhammad \uFDFA",
  "Make things easy, do not make things difficult. Spread glad tidings, do not drive people away. - Prophet Muhammad \uFDFA",
  "The strong person is not the one who can wrestle someone else down. The strong person is the one who can control himself when he is angry. - Prophet Muhammad \uFDFA",
  "None of you truly believes until he loves for his brother what he loves for himself. - Prophet Muhammad \uFDFA",
  "Speak good or remain silent. - Prophet Muhammad \uFDFA",
  "The most beloved of deeds to Allah are the most consistent of them, even if they are small. - Prophet Muhammad \uFDFA",
  "Take advantage of five before five: your youth before your old age, your health before your illness, your wealth before your poverty, your free time before your work, and your life before your death. - Prophet Muhammad \uFDFA",
  "Whoever believes in Allah and the Last Day, let him speak good or remain silent. - Prophet Muhammad \uFDFA",
  "The best among you are those who have the best character. - Prophet Muhammad \uFDFA",
  "Do not belittle any act of kindness, even meeting your brother with a cheerful face. - Prophet Muhammad \uFDFA",
  "Be in this world as if you were a stranger or a traveler along a path. - Prophet Muhammad \uFDFA",
  "Verily, with hardship comes ease. - Quran 94:6",
  "And He found you lost and guided you. - Quran 93:7",
  "Allah does not burden a soul beyond that it can bear. - Quran 2:286",
  "So verily, with hardship there is relief. Verily, with hardship there is relief. - Quran 94:5-6",
  "Indeed, Allah is with the patient. - Quran 2:153",
  "And whoever puts their trust in Allah, He will be enough for them. - Quran 65:3",
  "My mercy encompasses all things. - Quran 7:156",
  "The worldly life is but a play and amusement, and the home of the Hereafter is best for those who fear Allah. Will you not then understand? - Quran 6:32",
  "And We have certainly made the Quran easy to remember. So is there anyone who will be mindful? - Quran 54:17",
  "Richness is not having many possessions, but richness is being content with oneself. - Prophet Muhammad \uFDFA",
  "Whoever treads a path seeking knowledge, Allah will make easy for him the path to Paradise. - Prophet Muhammad \uFDFA",
  "The most perfect of believers in faith are those who are the best in character and the kindest to their families. - Prophet Muhammad \uFDFA",
  "A good word is charity. - Prophet Muhammad \uFDFA",
  "He who does not thank people does not thank Allah. - Prophet Muhammad \uFDFA",
  "The greatest jihad is to battle your own soul, to fight the evil within yourself. - Prophet Muhammad \uFDFA",
  "Patience is a pillar of faith. - Ali ibn Abi Talib (RA)",
  "If you want to know where your heart is, look where your mind goes when it wanders. - Ali ibn Abi Talib (RA)",
  "Tie your camel, then put your trust in Allah. - Prophet Muhammad \uFDFA",
  "Every new day that dawns upon a person, it calls out: O son of Adam, I am a new creation, and a witness over your deeds, so make the most of me, for I shall never return until the Day of Judgment. - Hasan al-Basri"
];

export const getQuoteForDate = (date: Date): string => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
};

export const getPropheticQuoteForDate = (date: Date): string => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  return PROPHETIC_QUOTES[dayOfYear % PROPHETIC_QUOTES.length];
};
