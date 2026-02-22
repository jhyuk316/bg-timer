export const COLOR_PALETTE = [
  { name: 'Crimson', hex: '#B84040' },
  { name: 'Orange', hex: '#CC7E3A' },
  { name: 'Amber', hex: '#C49645' },
  { name: 'Green', hex: '#4A9E6E' },
  { name: 'Teal', hex: '#4A9488' },
  { name: 'Sky', hex: '#6E9EB5' },
  { name: 'Cobalt', hex: '#3D6A9E' },
  { name: 'Purple', hex: '#7060A0' },
  { name: 'Stone', hex: '#9A857E' },
  { name: 'Ivory', hex: '#D8D4CF' },
];

export const DEFAULT_COLORS = ['#B84040', '#3D6A9E', '#C49645', '#4A9E6E', '#7060A0'];

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
