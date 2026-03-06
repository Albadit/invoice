/**
 * Currencies feature API functions
 */

import api, { API_URL } from '@/lib/api/api';
import type { Currency } from '@/lib/types';
import type { CurrenciesPost, CurrenciesPatch } from '@/lib/database.types';

export const currenciesApi = {
  /**
   * Get all currencies
   */
  async getAll(): Promise<Currency[]> {
    return api.get<Currency[]>(`${API_URL}/currencies?select=*&order=code.asc`);
  },

  /**
   * Create a new currency
   */
  async create(currencyData: CurrenciesPost): Promise<Currency> {
    const [newCurrency] = await api.post<Currency[]>(`${API_URL}/currencies`, currencyData, { prefer: 'return=representation' });
    return newCurrency;
  },

  /**
   * Update a currency
   */
  async update(id: string, currencyData: CurrenciesPatch): Promise<void> {
    await api.patch<void>(`${API_URL}/currencies?id=eq.${id}`, currencyData, { prefer: 'return=minimal' });
  },

  /**
   * Delete a currency
   */
  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/currencies?id=eq.${id}`);
  }
};
