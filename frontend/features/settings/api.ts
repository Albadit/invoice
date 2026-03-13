import api, { API_URL } from '@/lib/api/api';
import type { Settings } from '@/lib/types';
import type { SettingsPatch } from '@/lib/database.types';

export const settingsApi = {
  async get(): Promise<Settings | null> {
    const rows = await api.get<Settings[]>(`${API_URL}/settings?select=*&limit=1`);
    return rows.length > 0 ? rows[0] : null;
  },

  async upsert(data: SettingsPatch): Promise<Settings> {
    // Try to get existing row first
    const existing = await settingsApi.get();
    if (existing) {
      const [updated] = await api.patch<Settings[]>(
        `${API_URL}/settings?id=eq.${existing.id}`,
        data,
        { prefer: 'return=representation' },
      );
      return updated;
    }
    const [created] = await api.post<Settings[]>(
      `${API_URL}/settings`,
      data,
      { prefer: 'return=representation' },
    );
    return created;
  },
};
