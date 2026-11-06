const { spawn } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env };
// Some development terminals set this for their own Electron host.
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(__dirname, '..'), ...process.argv.slice(2)], {
  env, stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
