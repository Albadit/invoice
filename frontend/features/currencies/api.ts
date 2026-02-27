/**
 * Currencies feature API functions
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { Currency } from '@/lib/types';
import type { CurrenciesPost, CurrenciesPatch } from '@/lib/database.types';

export const currenciesApi = {
  /**
   * Get all currencies
   */
  async getAll(): Promise<Currency[]> {
    const response = await fetch(
      `${API_URL}/currencies?select=*&order=code.asc`,
      { headers: await getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch currencies');
    }
    
    return response.json();
  },

  /**
   * Create a new currency
   */
  async create(currencyData: CurrenciesPost): Promise<Currency> {
    const response = await fetch(`${API_URL}/currencies`, {
      method: 'POST',
      headers: await getHeaders('return=representation'),
      body: JSON.stringify(currencyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create currency');
    }
    
    const [newCurrency] = await response.json();
    return newCurrency;
  },

  /**
   * Update a currency
   */
  async update(id: string, currencyData: CurrenciesPatch): Promise<void> {
    const response = await fetch(`${API_URL}/currencies?id=eq.${id}`, {
      method: 'PATCH',
      headers: await getHeaders('return=minimal'),
      body: JSON.stringify(currencyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update currency');
    }
  },

  /**
   * Delete a currency
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/currencies?id=eq.${id}`, {
      method: 'DELETE',
      headers: await getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete currency');
    }
  }
};
