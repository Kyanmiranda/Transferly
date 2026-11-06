const { app, BrowserWindow, dialog, net, protocol, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const origin = 'app://transferly';
const smokeTest = process.argv.includes('--smoke-test');
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 1000, minHeight: 700,
    title: 'Transferly', show: !smokeTest, backgroundColor: '#faf9f6',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(({ url }) => {
    // PDF previews use blob URLs. Keep them inside sandboxed app windows.
    if (url.startsWith(`blob:${origin}/`)) return { action: 'allow', overrideBrowserWindowOptions: {
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    } };
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${origin}/`)) event.preventDefault();
  });
  window.webContents.on('did-fail-load', (_event, code, description) => {
    if (code === -3) return;
    console.error(description);
    if (smokeTest) app.exit(1);
    else dialog.showErrorBox('Transferly could not start', description);
  });
  if (smokeTest) {
    const timeout = setTimeout(() => app.exit(1), 30000);
    window.webContents.on('did-finish-load', async () => {
      try {
        const result = await window.webContents.executeJavaScript(`(async () => {
          for (let i = 0; i < 100 && !document.body.innerText.includes('New Transfer'); i++)
            await new Promise(resolve => setTimeout(resolve, 100));
          if (!document.body.innerText.includes('New Transfer')) throw Error('Dashboard did not render');
          for (const name of ['Transferly_Transfer_Authorization', 'Transferly_TFSA_Application', 'Transferly_FHSA_Application', 'Transferly_Electronic_Funds_Transfer_Form']) {
            const response = await fetch('/forms/' + name + '.pdf');
            if (!response.ok || !(await response.text()).startsWith('%PDF')) throw Error('Missing template: ' + name);
          }
          document.querySelector('a[href="/transfers/new"]').click();
          await new Promise(resolve => setTimeout(resolve, 500));
          if (location.pathname !== '/transfers/new') throw Error('Navigation failed');
          localStorage.setItem('desktop-smoke', 'ok');
          localStorage.removeItem('desktop-smoke');
          return 'Dashboard, navigation, PDF templates, and storage passed';
        })()`);
        console.log(result);
        clearTimeout(timeout);
        app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    });
  }
  window.loadURL(`${origin}/`);
}

app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'desktop-dist');
  protocol.handle('app', request => {
    const url = new URL(request.url);
    if (url.host !== 'transferly') return new Response('Forbidden', { status: 403 });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response('Bad request', { status: 400 }); }
    let target = path.resolve(root, `.${pathname}`);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
    if (!path.extname(pathname)) target = path.join(root, 'desktop.html');
    if (!fs.existsSync(target)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(target).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
