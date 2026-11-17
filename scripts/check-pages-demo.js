const { readdir, readFile, lstat } = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

async function checkDemo(directory = path.join(__dirname, '..', 'frontend', 'dist-demo')) {
  const files = [];
  async function walk(current) {
    for (const name of await readdir(current)) {
      assert.ok(!name.startsWith('.'), 'Arquivo oculto não pertence ao site.');
      const filename = path.join(current, name);
      const stat = await lstat(filename);
      assert.equal(stat.isSymbolicLink(), false, 'Links não pertencem ao artefato.');
      if (stat.isDirectory()) await walk(filename);
      else {
        assert.ok(['.html', '.css', '.js', '.svg', '.txt'].includes(path.extname(name)), 'Extensão não estática: ' + name);
        assert.ok(stat.size > 0, 'Arquivo vazio: ' + name);
        files.push(path.relative(directory, filename).split(path.sep).join('/'));
      }
    }
  }
  await walk(directory);
  const html = await readFile(path.join(directory, 'index.html'), 'utf8');
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /Demonstração acadêmica/);
  const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(resources.length >= 3);
  for (const resource of resources) {
    assert.ok(resource.startsWith('/Alexandr.IA/'), 'Recurso fora da base Pages.');
    assert.ok(files.includes(resource.slice('/Alexandr.IA/'.length)), 'Recurso ausente.');
  }
  let javascript = '';
  for (const file of files.filter((name) => name.endsWith('.js'))) javascript += await readFile(path.join(directory, file), 'utf8');
  assert.match(javascript, /Demonstração acadêmica — dados simulados/);
  assert.doesNotMatch(javascript, /\/api\/|\/logout|\/login|SESSION_SECRET|PGPASSWORD/);
  return { files, resources };
}

if (require.main === module) checkDemo().then(({ files }) => {
  console.log('Demonstração estática verificada: ' + files.length + ' arquivos.');
}).catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { checkDemo };
