const fs = require('node:fs');
const path = require('node:path');

function edit(relativePath, transform) {
  const target = path.join(__dirname, 'public', relativePath);
  const before = fs.readFileSync(target, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(target, after);
}

function removeOnce(source, pattern) {
  const next = source.replace(pattern, '');
  if (next === source) throw new Error('Unexpected registration form markup: ' + pattern);
  return next;
}

edit('index.html', source => {
  if (!source.includes('先行') && !source.includes('s-expression')) return source;
  const removals = [
    /<style>\n\.early-expression-field [^<]*<\/style>\n/,
    /^        <div class="fld early-expression-field">[\s\S]*?^        <\/div>\n/m,
    /<div><dt>先行申込みの表現について<\/dt><dd data-confirm="stageExpression"><\/dd><\/div>/,
    /,stageExpression:field\('s-expression'\)/,
    /^    if\(record\.stageExpression\.length>100\)[^\n]+\n/m,
    /<script id="expression-counter">[^<]+<\/script>\n/
  ];
  const next = removals.reduce(removeOnce, source);
  if (/先行|s-expression|stageExpression/.test(next)) throw new Error('Early-entry content remains in the signup page');
  return next;
});

if (fs.existsSync(path.join(__dirname, 'public/guide/index.html'))) {
  edit('guide/index.html', source => {
    const next = source
      .replace(/^<section class="early wrap">[^\n]+<\/section>\n/m, '')
      .replace('.ticket-grid>article,.early>*,.apply', '.ticket-grid>article,.apply')
      .replaceAll('詳細・先行お申込みへ', '詳細・お申込みへ');
    if (/先行|EARLY ENTRY/.test(next)) throw new Error('Early-entry content remains in the guide');
    return next;
  });
}
