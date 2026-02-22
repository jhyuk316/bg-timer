export const COLOR_PALETTE = [
  { name: 'Crimson', hex: '#B84040' },
  { name: 'Orange', hex: '#CC7E3A' },
  { name: 'Amber', hex: '#C49645' },
  { name: 'Green', hex: '#4A9E6E' },
  { name: 'Teal', hex: '#4A9488' },
  { name: 'Sky', hex: '#6E9EB5' },
  { name: 'Cobalt', hex: '#3D6A9E' },
  { name: 'Purple', hex: '#7060A0' },
  { name: 'Charcoal', hex: '#455159' },
  { name: 'Ivory', hex: '#D8D4CF' },
];

export const DEFAULT_COLORS = ['#B84040', '#3D6A9E', '#C49645', '#4A9E6E', '#7060A0'];

export const COLOR_PRESETS = {
  'SETI': {
    colors: ['#E08840', '#4CAF7A', '#7B5EA7', '#E8E4DF'],
    paletteMap: [1, 3, 7, 9],
    maxPlayers: 4,
  },
  '백로성': {
    colors: ['#C94040', '#D4B84E', '#5A9E64', '#4477B0'],
    paletteMap: [0, 2, 3, 6],
    maxPlayers: 4,
  },
  '버건디의 성': {
    colors: ['#C94040', '#4A9E6E', '#3D6A9E', '#4A4545'],
    paletteMap: [0, 3, 6, 8],
    maxPlayers: 4,
  },
  '엔데버 심해': {
    colors: ['#C94040', '#E0C850', '#50C4A8', '#7B5EA7', '#E8E4DF'],
    paletteMap: [0, 2, 4, 7, 9],
    maxPlayers: 5,
  },
  '윙스팬': {
    colors: ['#C94040', '#D4B84E', '#7EC060', '#5CADD4', '#7B5EA7'],
    paletteMap: [0, 2, 3, 6, 7],
    maxPlayers: 5,
  },
  "Ian O'Toole": {
    colors: ['#C4727A', '#D4A24E', '#8BAF6E', '#7CAFC4', '#8E7BB5'],
    paletteMap: [0, 2, 3, 5, 7],
    maxPlayers: 5,
  },
};

export const TIMER_PRESETS = {
  'Light':       { turnTime: 10,  reserveTime: 10 * 60,  penaltyTime: 1 * 60, targetMin: 15  },
  'Medium Light': { turnTime: 15,  reserveTime: 20 * 60,  penaltyTime: 2 * 60, targetMin: 30  },
  'Medium':       { turnTime: 20,  reserveTime: 50 * 60,  penaltyTime: 3 * 60, targetMin: 60  },
  'Medium Heavy': { turnTime: 30,  reserveTime: 75 * 60,  penaltyTime: 4 * 60, targetMin: 90  },
  'Heavy':       { turnTime: 45,  reserveTime: 100 * 60, penaltyTime: 5 * 60, targetMin: 120 },
};

const SETTINGS_KEY = 'bg-timer-settings';

export function getDefaultSettings() {
  return {
    activeMeeples: [true, false, false, false, false, false, true, false, false, false],
    playerCount: 2,
    players: Array.from({ length: 10 }, (_, i) => ({
      name: COLOR_PALETTE[i].name,
      color: COLOR_PALETTE[i].hex,
    })),
    presetName: 'Medium',
    turnTime: 20,
    reserveTime: 40 * 60,
    penaltyTime: 5 * 60,
    soundEnabled: true,
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return getDefaultSettings();
    const saved = JSON.parse(raw);
    const defaults = getDefaultSettings();
    const merged = { ...defaults, ...saved };

    // Migration: ensure players array has 10 entries
    if (merged.players.length < 10) {
      while (merged.players.length < 10) {
        const i = merged.players.length;
        merged.players.push({ name: COLOR_PALETTE[i].name, color: COLOR_PALETTE[i].hex });
      }
    }

    // Migration: generate activeMeeples from old playerCount + colors
    if (!saved.activeMeeples) {
      const active = new Array(10).fill(false);
      const oldCount = saved.playerCount || 2;
      const oldPlayers = saved.players || defaults.players;
      for (let i = 0; i < oldCount && i < oldPlayers.length; i++) {
        const hex = oldPlayers[i].color;
        const idx = COLOR_PALETTE.findIndex(c => c.hex === hex);
        if (idx >= 0) {
          active[idx] = true;
          // Copy name to the palette slot
          merged.players[idx] = { name: oldPlayers[i].name, color: COLOR_PALETTE[idx].hex };
        } else {
          // Color not in palette, activate by index
          active[i] = true;
          merged.players[i] = { name: oldPlayers[i].name, color: COLOR_PALETTE[i].hex };
        }
      }
      merged.activeMeeples = active;
      merged.playerCount = active.filter(Boolean).length;
    }

    return merged;
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
