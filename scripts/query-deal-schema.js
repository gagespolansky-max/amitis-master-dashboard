const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map((s, i) => i === 0 ? s.trim() : l.slice(l.indexOf('=') + 1).trim()))
);
process.env = { ...process.env, ...env };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('acio_deals')
    .select('id, company_name, deal_type, investment_type, stage, status')
    .order('company_name');

  if (error) { console.error('Error:', error.message); return; }

  console.log('=== ALL DEALS (' + data.length + ') ===');
  for (const d of data) {
    console.log('  ' + d.company_name + ' | deal_type=' + (d.deal_type || 'NULL') + ' | investment_type=' + (d.investment_type || 'NULL') + ' | stage=' + d.stage + ' | status=' + d.status);
  }

  const dealTypes = [...new Set(data.map(d => d.deal_type).filter(Boolean))];
  const investTypes = [...new Set(data.map(d => d.investment_type).filter(Boolean))];
  const nullDealType = data.filter(d => d.deal_type === null).length;
  const nullInvestType = data.filter(d => d.investment_type === null).length;

  console.log('\n=== DISTINCT deal_type values ===');
  dealTypes.forEach(v => {
    const count = data.filter(d => d.deal_type === v).length;
    console.log('  ' + v + ' (' + count + ')');
  });
  console.log('  NULL (' + nullDealType + ')');

  console.log('\n=== DISTINCT investment_type values ===');
  investTypes.forEach(v => {
    const count = data.filter(d => d.investment_type === v).length;
    console.log('  ' + v + ' (' + count + ')');
  });
  console.log('  NULL (' + nullInvestType + ')');

  // Cross-tab
  console.log('\n=== CROSS-TAB: deal_type x investment_type ===');
  for (const d of data) {
    if (d.deal_type || d.investment_type) {
      console.log('  ' + d.company_name + ': deal_type=' + (d.deal_type || 'NULL') + ', investment_type=' + (d.investment_type || 'NULL'));
    }
  }
})();
