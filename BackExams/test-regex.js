// Test específico para debugging del regex problemático

const testHtml = `<div style="background-color:#fff5f5;border-left:6px solid #dc3545;font-family:Arial,sans-serif;margin:20px 0;padding:15px">`;

console.log('🔍 Testing HTML attribute regex');
console.log('Original HTML:');
console.log(testHtml);
console.log('');

// Reproducir el regex problemático
const regex = /(\w+)="([^"]*)"/g;
let match;
let matches = [];

while ((match = regex.exec(testHtml)) !== null) {
  matches.push({
    full: match[0],
    attr: match[1], 
    value: match[2],
    index: match.index
  });
}

console.log('Matches encontrados:');
matches.forEach((m, i) => {
  console.log(`${i + 1}. attr="${m.attr}", value="${m.value}"`);
  console.log(`   Full match: "${m.full}"`);
  console.log(`   Index: ${m.index}`);
});

console.log('');

// Aplicar el procesamiento actual
let cleaned = testHtml;
cleaned = cleaned.replace(/(\w+)="([^"]*)"/g, (match, attr, value) => {
  console.log(`Processing: attr="${attr}", value="${value}"`);
  const cleanValue = value
    .replace(/[""«»„"]/g, '"')
    .replace(/[''‹›‚‛]/g, "'")
    .replace(/[–—]/g, '-');
  console.log(`  Clean value: "${cleanValue}"`);
  const result = `${attr}="${cleanValue}"`;
  console.log(`  Result: "${result}"`);
  return result;
});

console.log('');
console.log('Final result:');
console.log(cleaned);

// Test específico del valor problemático
console.log('');
console.log('🔍 Test específico del valor style:');
const styleValue = "background-color:#fff5f5;border-left:6px solid #dc3545;font-family:Arial,sans-serif;margin:20px 0;padding:15px";
console.log('Original style value:');
console.log(`"${styleValue}"`);

const cleanStyleValue = styleValue
  .replace(/[""«»„"]/g, '"')
  .replace(/[''‹›‚‛]/g, "'")
  .replace(/[–—]/g, '-');
  
console.log('After character replacement:');
console.log(`"${cleanStyleValue}"`);