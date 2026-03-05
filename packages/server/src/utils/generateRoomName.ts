const ADJECTIVES = [
  'Crimson', 'Silver', 'Golden', 'Shadow', 'Crystal',
  'Thunder', 'Velvet', 'Cosmic', 'Mystic', 'Brave',
  'Swift', 'Noble', 'Lucky', 'Neon', 'Wild',
  'Frozen', 'Blazing', 'Silent', 'Royal', 'Iron',
];

const NOUNS = [
  'Tiger', 'Phoenix', 'Dragon', 'Wolf', 'Falcon',
  'Panther', 'Eagle', 'Cobra', 'Lion', 'Hawk',
  'Bear', 'Fox', 'Raven', 'Shark', 'Viper',
  'Orca', 'Lynx', 'Puma', 'Stag', 'Owl',
];

export function generateRoomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}
