/**
 * Templates feature API functions
 */

import api, { API_URL } from '@/lib/api/api';
import type { Template } from '@/lib/types';
import type { TemplatesPost, TemplatesPatch } from '@/lib/database.types';

export const templatesApi = {
  /**
   * Get all templates
   */
  async getAll(authToken?: string): Promise<Template[]> {
    return api.get<Template[]>(`${API_URL}/templates?select=*&order=name.asc`, { authToken });
  },

  /**
   * Create a new template
   */
  async create(templateData: TemplatesPost): Promise<Template> {
    const [newTemplate] = await api.post<Template[]>(`${API_URL}/templates`, templateData, { prefer: 'return=representation' });
    return newTemplate;
  },

  /**
   * Update a template
   */
  async update(id: string, templateData: TemplatesPatch): Promise<void> {
    await api.patch<void>(`${API_URL}/templates?id=eq.${id}`, templateData, { prefer: 'return=minimal' });
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<Template> {
    const data = await api.get<Template[]>(`${API_URL}/templates?id=eq.${id}&select=*`);
    if (!data || data.length === 0) {
      throw new Error('Template not found');
    }
    return data[0];
  },

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/templates?id=eq.${id}`);
  }
};
