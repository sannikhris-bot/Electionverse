import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { applyAction, newCampaign, replay, type CampaignAction, type CampaignState, type CountryPack, type NewCampaignOptions } from '@electionverse/engine';
import { getPack } from '@electionverse/packs';

const SAVE_KEY = 'electionverse:campaign:v1';
const PASSPORT_KEY = 'electionverse:passport:v1';

/** A save is just the setup and the action log: the engine replays it exactly. */
interface SaveFile {
  packId: string;
  packVersion: string;
  opts: NewCampaignOptions;
  actions: CampaignAction[];
}

export interface PassportEntry {
  finishedAt: string;
  packId: string;
  partyId: string;
  nominee: string;
  outcome: CampaignState['result'] extends infer R ? (R extends { playerOutcome: infer O } ? O : never) : never;
  headline: string;
}

interface GameStore {
  loaded: boolean;
  pack: CountryPack | null;
  opts: NewCampaignOptions | null;
  actions: CampaignAction[];
  state: CampaignState | null;
  error: string | null;
  passport: PassportEntry[];
  load: () => Promise<void>;
  start: (packId: string, opts: NewCampaignOptions) => void;
  dispatch: (action: CampaignAction) => boolean;
  abandon: () => void;
  clearError: () => void;
}

async function persist(save: SaveFile | null) {
  try {
    if (save) await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(save));
    else await AsyncStorage.removeItem(SAVE_KEY);
  } catch {
    // Saving is best-effort; the run continues in memory.
  }
}

export const useGame = create<GameStore>((set, get) => ({
  loaded: false,
  pack: null,
  opts: null,
  actions: [],
  state: null,
  error: null,
  passport: [],

  load: async () => {
    if (get().loaded) return;
    let passport: PassportEntry[] = [];
    try {
      const p = await AsyncStorage.getItem(PASSPORT_KEY);
      if (p) passport = JSON.parse(p) as PassportEntry[];
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (raw) {
        const save = JSON.parse(raw) as SaveFile;
        const pack = getPack(save.packId);
        // A save made against different pack content cannot be replayed faithfully.
        if (pack && pack.version === save.packVersion) {
          const state = replay(pack, save.opts, save.actions);
          set({ pack, opts: save.opts, actions: save.actions, state });
        }
      }
    } catch {
      // Corrupt save: start fresh.
    }
    set({ loaded: true, passport });
  },

  start: (packId, opts) => {
    const pack = getPack(packId);
    if (!pack) {
      set({ error: `Country ${packId} is not playable yet.` });
      return;
    }
    const state = newCampaign(pack, opts);
    set({ pack, opts, actions: [], state, error: null });
    void persist({ packId, packVersion: pack.version, opts, actions: [] });
  },

  dispatch: (action) => {
    const { pack, state, opts, actions } = get();
    if (!pack || !state || !opts) return false;
    try {
      const next = applyAction(pack, state, action);
      const nextActions = [...actions, action];
      set({ state: next, actions: nextActions, error: null });
      void persist({ packId: pack.id, packVersion: pack.version, opts, actions: nextActions });
      if (next.phase === 'finished' && state.phase !== 'finished' && next.result) {
        const entry: PassportEntry = {
          finishedAt: new Date().toISOString(),
          packId: pack.id,
          partyId: next.playerPartyId,
          nominee: next.nominee.name,
          outcome: next.result.playerOutcome,
          headline: next.result.headline,
        };
        const passport = [entry, ...get().passport].slice(0, 100);
        set({ passport });
        void AsyncStorage.setItem(PASSPORT_KEY, JSON.stringify(passport)).catch(() => undefined);
      }
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  abandon: () => {
    set({ pack: null, opts: null, actions: [], state: null });
    void persist(null);
  },

  clearError: () => set({ error: null }),
}));

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
