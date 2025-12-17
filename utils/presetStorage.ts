import { BenchmarkPreset } from '../components/CompensatoryDesignTab';

const STORAGE_KEY = 'mutationMechanic_presets_v1';
const MAX_PRESETS = 200;

export interface PresetSchema extends BenchmarkPreset {
  transcriptId?: string;
  exampleInputs?: any;
  createdAt: number;
  modifiedAt: number;
}

export const presetStorage = {
  getPresets(): PresetSchema[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      // Sort by modifiedAt descending for LRU-like access
      return parsed.sort((a: any, b: any) => b.modifiedAt - a.modifiedAt);
    } catch (e) {
      console.error('Failed to parse presets', e);
      return [];
    }
  },

  savePreset(preset: Omit<PresetSchema, 'createdAt' | 'modifiedAt'>): PresetSchema[] {
    const presets = this.getPresets();
    const now = Date.now();
    
    const existingIdx = presets.findIndex(p => p.id === preset.id || (p.hgvs === preset.hgvs && p.title === preset.title));
    
    let updatedPresets: PresetSchema[];
    if (existingIdx > -1) {
      updatedPresets = [...presets];
      updatedPresets[existingIdx] = {
        ...presets[existingIdx],
        ...preset,
        modifiedAt: now
      };
    } else {
      const newPreset: PresetSchema = {
        ...preset,
        createdAt: now,
        modifiedAt: now
      };
      updatedPresets = [newPreset, ...presets];
    }

    // LRU Eviction: Limit to MAX_PRESETS
    if (updatedPresets.length > MAX_PRESETS) {
      updatedPresets = updatedPresets.slice(0, MAX_PRESETS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
    return updatedPresets;
  },

  deletePreset(id: string): PresetSchema[] {
    const presets = this.getPresets().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return presets;
  },

  importPresets(jsonString: string): PresetSchema[] {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      
      const current = this.getPresets();
      const merged = [...imported, ...current].reduce((acc: PresetSchema[], item) => {
        if (!acc.find(p => p.id === item.id)) acc.push(item);
        return acc;
      }, []);

      const final = merged.slice(0, MAX_PRESETS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
      return final;
    } catch (e) {
      throw new Error('Failed to import presets: ' + (e as Error).message);
    }
  },

  exportPresets(): string {
    return JSON.stringify(this.getPresets(), null, 2);
  }
};