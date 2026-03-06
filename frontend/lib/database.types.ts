// Auto-generated TypeScript types from PostgreSQL database
// Generated on: 2026-02-27T12:13:10.603Z

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AmountType = 'percent' | 'fixed'

export type StatusType = 'pending' | 'paid' | 'overdue' | 'cancelled'

export type SymbolPositionType = 'left' | 'right'

export interface Companies {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  zip_code: string | null
  country: string | null
  vat_number: string | null
  coc_number: string | null
  logo_url: string | null
  template_id: string | null
  currency_id: string | null
  tax_percent: number | null
  terms: string | null
  language: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Clients {
  id: string
  user_id: string
  company_id: string | null
  name: string
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  zip_code: string | null
  country: string | null
  tax_id: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Currencies {
  id: string
  user_id: string | null
  code: string
  name: string
  symbol: string
  symbol_position: SymbolPositionType
  symbol_space: boolean
  is_system: boolean
  created_at: string | null
  updated_at: string | null
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
  user_id: string
  company_id: string
  currency_id: string
  template_id: string | null
  client_id: string | null
  invoice_code: string
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
  language: string | null
  subtotal_amount: number | null
  total_amount: number | null
  created_at: string | null
  updated_at: string | null
  search_tsv: unknown | null
  search_text: string | null
}

export interface Templates {
  id: string
  user_id: string | null
  name: string
  styling: string | null
  is_system: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Roles {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Permissions {
  id: string
  key: string
  description: string | null
  route: string | null
  created_at: string | null
}

export interface RolePermissions {
  id: string
  role_id: string
  permission_id: string
  created_at: string | null
}

export interface UserRoles {
  id: string
  user_id: string
  role_id: string
  created_at: string | null
}

// Helper types for REST API operations
export type CompaniesGet = Companies
export type CompaniesPost = Omit<Companies, 'id' | 'created_at' | 'updated_at' | 'user_id'>
export type CompaniesPut = Omit<Companies, 'created_at' | 'updated_at'>
export type CompaniesPatch = Partial<CompaniesPost>
export type CompaniesDelete = Pick<Companies, 'id'>

export type ClientsGet = Clients
export type ClientsPost = Omit<Clients, 'id' | 'created_at' | 'updated_at' | 'user_id'>
export type ClientsPut = Omit<Clients, 'created_at' | 'updated_at'>
export type ClientsPatch = Partial<ClientsPost>
export type ClientsDelete = Pick<Clients, 'id'>

export type CurrenciesGet = Currencies
export type CurrenciesPost = Omit<Currencies, 'id' | 'created_at' | 'updated_at' | 'is_system' | 'user_id'>
export type CurrenciesPut = Omit<Currencies, 'created_at' | 'updated_at'>
export type CurrenciesPatch = Partial<CurrenciesPost>
export type CurrenciesDelete = Pick<Currencies, 'id'>

export type InvoiceItemsGet = InvoiceItems
export type InvoiceItemsPost = Omit<InvoiceItems, 'id' | 'created_at' | 'updated_at'>
export type InvoiceItemsPut = Omit<InvoiceItems, 'created_at' | 'updated_at'>
export type InvoiceItemsPatch = Partial<InvoiceItemsPost>
export type InvoiceItemsDelete = Pick<InvoiceItems, 'id'>

export type InvoicesGet = Invoices
export type InvoicesPost = Omit<Invoices, 'id' | 'created_at' | 'updated_at' | 'search_tsv' | 'search_text' | 'invoice_code' | 'user_id'>
export type InvoicesPut = Omit<Invoices, 'created_at' | 'updated_at'>
export type InvoicesPatch = Partial<InvoicesPost>
export type InvoicesDelete = Pick<Invoices, 'id'>

export type TemplatesGet = Templates
export type TemplatesPost = Omit<Templates, 'id' | 'created_at' | 'updated_at' | 'is_system' | 'user_id'>
export type TemplatesPut = Omit<Templates, 'created_at' | 'updated_at'>
export type TemplatesPatch = Partial<TemplatesPost>
export type TemplatesDelete = Pick<Templates, 'id'>

export type RolesGet = Roles
export type RolesPost = Omit<Roles, 'id' | 'created_at' | 'updated_at' | 'is_system'>
export type RolesPut = Omit<Roles, 'created_at' | 'updated_at'>
export type RolesPatch = Partial<RolesPost>
export type RolesDelete = Pick<Roles, 'id'>

export type PermissionsGet = Permissions
export type PermissionsPost = Omit<Permissions, 'id' | 'created_at'>
export type PermissionsPut = Omit<Permissions, 'created_at'>
export type PermissionsPatch = Partial<PermissionsPost>
export type PermissionsDelete = Pick<Permissions, 'id'>

export type RolePermissionsGet = RolePermissions
export type RolePermissionsPost = Omit<RolePermissions, 'id' | 'created_at'>
export type RolePermissionsDelete = Pick<RolePermissions, 'id'>

export type UserRolesGet = UserRoles
export type UserRolesPost = Omit<UserRoles, 'id' | 'created_at'>
export type UserRolesDelete = Pick<UserRoles, 'id'>

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
      clients: {
        Row: Clients
        Get: ClientsGet
        Post: ClientsPost
        Put: ClientsPut
        Patch: ClientsPatch
        Delete: ClientsDelete
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
      roles: {
        Row: Roles
        Get: RolesGet
        Post: RolesPost
        Put: RolesPut
        Patch: RolesPatch
        Delete: RolesDelete
      }
      permissions: {
        Row: Permissions
        Get: PermissionsGet
        Post: PermissionsPost
        Put: PermissionsPut
        Patch: PermissionsPatch
        Delete: PermissionsDelete
      }
      role_permissions: {
        Row: RolePermissions
        Get: RolePermissionsGet
        Post: RolePermissionsPost
        Delete: RolePermissionsDelete
      }
      user_roles: {
        Row: UserRoles
        Get: UserRolesGet
        Post: UserRolesPost
        Delete: UserRolesDelete
      }
    }
  }
}
