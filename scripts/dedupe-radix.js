const fs = require('fs');
const path = require('path');

const radixDir = path.join(__dirname, '..', 'node_modules', '@radix-ui');

function findNestedDirs(basePath, targetPkg) {
  const results = [];
  if (!fs.existsSync(basePath)) return results;
  
  const entries = fs.readdirSync(basePath);
  for (const entry of entries) {
    const pkgDir = path.join(basePath, entry);
    if (!fs.statSync(pkgDir).isDirectory()) continue;
    
    const nestedModules = path.join(pkgDir, 'node_modules', '@radix-ui', targetPkg);
    if (fs.existsSync(nestedModules)) {
      results.push(nestedModules);
    }
  }
  return results;
}

function rmSync(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  removed: ${path.relative(process.cwd(), dir)}`);
  } catch (e) {}
}

console.log('Deduplicating @radix-ui/react-compose-refs...');
const nestedComposeRefs = findNestedDirs(radixDir, 'react-compose-refs');
nestedComposeRefs.forEach(rmSync);

const patchedFile = path.join(radixDir, 'react-compose-refs', 'dist', 'index.mjs');
if (fs.existsSync(patchedFile)) {
  const content = fs.readFileSync(patchedFile, 'utf8');
  if (content.includes('return ref(value)')) {
    console.log('WARNING: compose-refs patch not applied! Re-run patch-package.');
  } else {
    console.log('compose-refs patch verified.');
  }
}

console.log(`Done. Removed ${nestedComposeRefs.length} nested compose-refs copies.`);
