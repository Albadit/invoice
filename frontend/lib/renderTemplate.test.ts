/**
 * Template Rendering Tests
 * 
 * This file demonstrates how to use the renderInvoiceToHtml utility
 * with templates from the database.
 */

import { renderInvoiceToHtml, type TemplateContext } from './renderTemplate';
import { templatesApi, invoicesApi } from './api';

/**
 * Test: Render invoice with data from database
 * 
 * This test fetches a real invoice from the database and renders it using the template from the database.
 */
export async function testRenderInvoice() {
  // Fetch invoices from database
  const invoices = await invoicesApi.getAll();
  
  if (!invoices || invoices.length === 0) {
    return { 
      success: false, 
      error: 'No invoices found in database' 
    };
  }
  
  // Use the first invoice
  const invoice = invoices[0];
  
  // Fetch template from database
  const templates = await templatesApi.getAll();
  
  if (!templates || templates.length === 0 || !templates[0]?.styling) {
    return { 
      success: false, 
      error: 'No templates found in database' 
    };
  }
  
  const dbTemplate = templates[0];
  
  const templateString = dbTemplate.styling!;
    
  console.log(`Using invoice: ${invoice.invoice_number}`);
  console.log(`Using template: ${dbTemplate.name}`);
  
  // Prepare context with database data
  const context: TemplateContext = {
    invoice,
    company: invoice.company,
    currency: invoice.currency
  };

  try {
    // Render the invoice
    const html = renderInvoiceToHtml(templateString, context);
    return { 
      success: true, 
      html,
      template: templateString,
      invoice,
      company: invoice.company,
      currency: invoice.currency
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      template: templateString,
      invoice,
      company: invoice.company,
      currency: invoice.currency
    };
  }
}

/**
 * Run the test
 */
export async function runTest() {
  try {
    console.log('='.repeat(80));
    console.log('Testing Template Rendering with Database Data');
    console.log('='.repeat(80));
    console.log();

    const result = await testRenderInvoice();
    
    if (result.success) {
      console.log('✅ SUCCESS! Template rendered successfully');
      console.log('\nRENDERED HTML:');
      console.log('-'.repeat(80));
      console.log(result.html?.substring(0, 1000) + '...');
      console.log('-'.repeat(80));
      console.log('\nFull HTML length:', result.html?.length, 'characters');
    } else {
      console.log('❌ ERROR:', result.error);
      console.log('\nDEBUG INFO:');
      console.log('- Template length:', result.template?.length);
      console.log('- Invoice number:', result.invoice?.invoice_number);
      console.log('- Company name:', result.company?.name);
      console.log('- Currency:', result.currency?.code);
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('Test completed');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export for manual testing
if (require.main === module) {
  runTest().catch(console.error);
}
