export const COLOR_PALETTE = [
  { name: 'Crimson', hex: '#C94040' },
  { name: 'Coral', hex: '#E07060' },
  { name: 'Dusty Rose', hex: '#C4727A' },
  { name: 'Magenta', hex: '#B8456B' },
  { name: 'Sienna', hex: '#D47F52' },
  { name: 'Orange', hex: '#E08840' },
  { name: 'Amber', hex: '#D4A24E' },
  { name: 'Gold', hex: '#E0C850' },
  { name: 'Sage', hex: '#8BAF6E' },
  { name: 'Emerald', hex: '#4CAF7A' },
  { name: 'Teal', hex: '#4E9E8E' },
  { name: 'Turquoise', hex: '#50C4C4' },
  { name: 'Sky', hex: '#7CAFC4' },
  { name: 'Cobalt', hex: '#4477B0' },
  { name: 'Navy', hex: '#2B5278' },
  { name: 'Lavender', hex: '#8E7BB5' },
  { name: 'Purple', hex: '#7B5EA7' },
  { name: 'Ivory', hex: '#E8E4DF' },
  { name: 'Stone', hex: '#A89088' },
  { name: 'Espresso', hex: '#6B4E3D' },
];

export const DEFAULT_COLORS = ['#C94040', '#4477B0', '#D4A24E', '#4CAF7A', '#8E7BB5'];

export const COLOR_PRESETS = {
  "Ian O'Toole": {
    colors: ['#7CAFC4', '#D4A24E', '#C4727A', '#4E9E8E', '#8E7BB5', '#D47F52', '#8BAF6E', '#A89088'],
    maxPlayers: 8,
  },
  'SETI': {
    colors: ['#E8E4DF', '#4CAF7A', '#E08840', '#7B5EA7'],
    maxPlayers: 4,
  },
  '백로성': {
    colors: ['#C94040', '#4477B0', '#D4B84E', '#5A9E64'],
    maxPlayers: 4,
  },
  'Endeavor Deep Sea': {
    colors: ['#E8E4DF', '#50C4A8', '#E0C850', '#7B5EA7', '#C94040'],
    maxPlayers: 5,
  },
};

export const TIMER_PRESETS = {
  Filler:  { turnTime: 20,  reserveTime: 5 * 60,  penaltyTime: 2 * 60  },
  Light:   { turnTime: 30,  reserveTime: 15 * 60, penaltyTime: 3 * 60  },
  Middle:  { turnTime: 45,  reserveTime: 30 * 60, penaltyTime: 5 * 60  },
  Heavy:   { turnTime: 60,  reserveTime: 50 * 60, penaltyTime: 5 * 60  },
  Epic:    { turnTime: 90,  reserveTime: 60 * 60, penaltyTime: 10 * 60 },
};

const SETTINGS_KEY = 'bg-timer-settings';

export function getDefaultSettings() {
  return {
    playerCount: 2,
    players: Array.from({ length: 5 }, (_, i) => ({
      name: `Player ${i + 1}`,
      color: DEFAULT_COLORS[i],
    })),
    presetName: 'Middle',
    turnTime: 45,
    reserveTime: 30 * 60,
    penaltyTime: 5 * 60,
    carryOverTurnTime: false,
    soundEnabled: true,
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return getDefaultSettings();
    const saved = JSON.parse(raw);
    const defaults = getDefaultSettings();
    return { ...defaults, ...saved };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
