/**
 * Templates feature API functions
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { Template } from '@/lib/types';
import type { TemplatesPost, TemplatesPatch } from '@/lib/database.types';

export const templatesApi = {
  /**
   * Get all templates
   */
  async getAll(authToken?: string): Promise<Template[]> {
    const response = await fetch(
      `${API_URL}/templates?select=*&order=name.asc`,
      { headers: await getHeaders(undefined, authToken) }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    return response.json();
  },

  /**
   * Create a new template
   */
  async create(templateData: TemplatesPost): Promise<Template> {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: await getHeaders('return=representation'),
      body: JSON.stringify(templateData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    
    const [newTemplate] = await response.json();
    return newTemplate;
  },

  /**
   * Update a template
   */
  async update(id: string, templateData: TemplatesPatch): Promise<void> {
    const response = await fetch(`${API_URL}/templates?id=eq.${id}`, {
      method: 'PATCH',
      headers: await getHeaders('return=minimal'),
      body: JSON.stringify(templateData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update template');
    }
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<Template> {
    const response = await fetch(
      `${API_URL}/templates?id=eq.${id}&select=*`,
      { headers: await getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Template not found');
    }
    
    return data[0];
  },

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/templates?id=eq.${id}`, {
      method: 'DELETE',
      headers: await getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete template');
    }
  }
};
