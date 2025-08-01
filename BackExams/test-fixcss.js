// Test específico para debugging del método fixCssStyles

import ExamService from './services/exam.services.js';

const examService = new ExamService();

const testHtml = `<div style="background-color:#fff5f5;border-left:6px solid #dc3545;font-family:Arial,sans-serif;margin:20px 0;padding:15px"><p>Test</p></div>`;

console.log('🔍 Testing fixCssStyles method');
console.log('Original HTML:');
console.log(testHtml);
console.log('');

const result = examService.fixCssStyles(testHtml);

console.log('Result after fixCssStyles:');
console.log(result);
console.log('');

// Test específico del valor style problemático
const problematicHtml = `<span style="background-color:#FFD700;color:#000000;padding:2px 6px;border-radius:3px;font-weight:700;border:1px solid #DAA520">Test</span>`;

console.log('🔍 Testing problematic style:');
console.log('Original:');
console.log(problematicHtml);

const problematicResult = examService.fixCssStyles(problematicHtml);
console.log('Result:');
console.log(problematicResult);

// Manual step-by-step debugging
console.log('');
console.log('🔍 Manual debugging of CSS processing:');
const styleValue = "background-color:#FFD700;color:#000000;padding:2px 6px;border-radius:3px;font-weight:700;border:1px solid #DAA520";
console.log('Original style value:');
console.log(`"${styleValue}"`);

// Step 1: Split by semicolon
const props = styleValue.split(';');
console.log('After split by semicolon:');
props.forEach((prop, i) => {
  console.log(`  ${i}: "${prop}"`);
});

// Step 2: Process each property
console.log('Processing each property:');
const processed = props.map(prop => {
  const trimmed = prop.trim();
  console.log(`  Processing: "${trimmed}"`);
  
  if (!trimmed || !trimmed.includes(':')) {
    console.log(`    -> Empty or no colon, returning ""`);
    return '';
  }
  
  const [property, ...valueParts] = trimmed.split(':');
  const value = valueParts.join(':').trim();
  
  console.log(`    -> property: "${property.trim()}", value: "${value}"`);
  
  if (!property || !value) {
    console.log(`    -> Empty property or value, returning ""`);
    return '';
  }
  
  const result = `${property.trim()}:${value}`;
  console.log(`    -> result: "${result}"`);
  return result;
}).filter(s => s);

console.log('Final processed properties:');
processed.forEach((prop, i) => {
  console.log(`  ${i}: "${prop}"`);
});

const final = processed.join(';');
console.log(`Final joined: "${final}"`);