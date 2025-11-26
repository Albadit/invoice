// Auto-generated TypeScript types from PostgreSQL database
// Generated on: 2025-11-26T21:26:25.768Z

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AmountType = 'percent' | 'fixed'

export type StatusType = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface Companies {
  id: string
  name: string
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  zip_code: string | null
  country: string | null
  logo_url: string | null
  template_id: string | null
  currency_id: string | null
  tax_percent: number | null
  terms: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Currencies {
  id: string
  code: string
  name: string
  symbol: string
}

export interface InvoiceItems {
  id: string
  invoice_id: string
  name: string
  quantity: number
  unit_price: number
  total_amount: number | null
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

export interface Invoices {
  id: string
  company_id: string
  currency_id: string
  template_id: string | null
  invoice_number: string
  status: StatusType
  customer_name: string
  customer_street: string
  customer_city: string
  customer_zip_code: string
  customer_country: string
  issue_date: string | null
  due_date: string | null
  discount_type: AmountType | null
  discount_amount: number | null
  discount_total_amount: number | null
  tax_type: AmountType | null
  tax_amount: number | null
  tax_total_amount: number | null
  shipping_type: AmountType | null
  shipping_amount: number | null
  shipping_total_amount: number | null
  notes: string | null
  terms: string | null
  subtotal_amount: number | null
  total_amount: number | null
  created_at: string | null
  updated_at: string | null
}

export interface Templates {
  id: string
  name: string
  styling: string | null
  created_at: string | null
  updated_at: string | null
}

// Helper types for REST API operations
export type CompaniesGet = Companies
export type CompaniesPost = Omit<Companies, 'id' | 'created_at' | 'updated_at'>
export type CompaniesPut = Omit<Companies, 'created_at' | 'updated_at'>
export type CompaniesPatch = Partial<CompaniesPost>
export type CompaniesDelete = Pick<Companies, 'id'>

export type CurrenciesGet = Currencies
export type CurrenciesPost = Omit<Currencies, 'id' | 'created_at' | 'updated_at'>
export type CurrenciesPut = Omit<Currencies, 'created_at' | 'updated_at'>
export type CurrenciesPatch = Partial<CurrenciesPost>
export type CurrenciesDelete = Pick<Currencies, 'id'>

export type InvoiceItemsGet = InvoiceItems
export type InvoiceItemsPost = Omit<InvoiceItems, 'id' | 'created_at' | 'updated_at'>
export type InvoiceItemsPut = Omit<InvoiceItems, 'created_at' | 'updated_at'>
export type InvoiceItemsPatch = Partial<InvoiceItemsPost>
export type InvoiceItemsDelete = Pick<InvoiceItems, 'id'>

export type InvoicesGet = Invoices
export type InvoicesPost = Omit<Invoices, 'id' | 'created_at' | 'updated_at'>
export type InvoicesPut = Omit<Invoices, 'created_at' | 'updated_at'>
export type InvoicesPatch = Partial<InvoicesPost>
export type InvoicesDelete = Pick<Invoices, 'id'>

export type TemplatesGet = Templates
export type TemplatesPost = Omit<Templates, 'id' | 'created_at' | 'updated_at'>
export type TemplatesPut = Omit<Templates, 'created_at' | 'updated_at'>
export type TemplatesPatch = Partial<TemplatesPost>
export type TemplatesDelete = Pick<Templates, 'id'>

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Companies
        Get: CompaniesGet
        Post: CompaniesPost
        Put: CompaniesPut
        Patch: CompaniesPatch
        Delete: CompaniesDelete
      }
      currencies: {
        Row: Currencies
        Get: CurrenciesGet
        Post: CurrenciesPost
        Put: CurrenciesPut
        Patch: CurrenciesPatch
        Delete: CurrenciesDelete
      }
      invoice_items: {
        Row: InvoiceItems
        Get: InvoiceItemsGet
        Post: InvoiceItemsPost
        Put: InvoiceItemsPut
        Patch: InvoiceItemsPatch
        Delete: InvoiceItemsDelete
      }
      invoices: {
        Row: Invoices
        Get: InvoicesGet
        Post: InvoicesPost
        Put: InvoicesPut
        Patch: InvoicesPatch
        Delete: InvoicesDelete
      }
      templates: {
        Row: Templates
        Get: TemplatesGet
        Post: TemplatesPost
        Put: TemplatesPut
        Patch: TemplatesPatch
        Delete: TemplatesDelete
      }
    }
  }
}
