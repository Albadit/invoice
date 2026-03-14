/**
 * PDF Margins feature API functions
 */

import api, { API_URL } from '@/lib/api/api';
import type { PdfMargin } from '@/lib/types';
import type { PdfMarginsPost, PdfMarginsPatch } from '@/lib/database.types';

export const pdfMarginsApi = {
  async getAll(authToken?: string): Promise<PdfMargin[]> {
    return api.get<PdfMargin[]>(`${API_URL}/pdf_margins?select=*&order=sort.asc`, { authToken });
  },

  async create(data: PdfMarginsPost): Promise<PdfMargin> {
    const [newMargin] = await api.post<PdfMargin[]>(`${API_URL}/pdf_margins`, data, { prefer: 'return=representation' });
    return newMargin;
  },

  async update(id: string, data: PdfMarginsPatch): Promise<void> {
    await api.patch<void>(`${API_URL}/pdf_margins?id=eq.${id}`, data, { prefer: 'return=minimal' });
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/pdf_margins?id=eq.${id}`);
  },
};
