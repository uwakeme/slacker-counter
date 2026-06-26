// Electron 主进程 — 加载打包后的 React 产物
// 关闭 nodeIntegration + 启用 contextIsolation,通过 preload 暴露受控 API
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

// 免安装绿色版:数据持久化到 exe 同级目录的 userData(每台机器每个目录独立)
// 这样 portable 拷贝到别处,设置不会丢
const userDataPath = path.join(path.dirname(app.getPath('exe')), '.userdata');
app.setPath('userData', userDataPath);

const isDev = !app.isPackaged;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 660,
    minWidth: 400,
    minHeight: 580,
    title: 'Slacker Counter',
    // 去掉原生标题栏和外框,自定义标题栏写在 renderer 里
    frame: false,
    autoHideMenuBar: true,
    // 与 renderer 顶部品牌面板同色,避免加载时白闪
    backgroundColor: '#d4cfc5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 生产加载本地 dist,开发走 vite dev server
  const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(indexHtml);
  }

  // 外链交给系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 关闭默认菜单栏(开发时保留方便调试)
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // renderer 自定义标题栏的窗口控制按钮
  ipcMain.on('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });
  ipcMain.on('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });
  // renderer 根据内容(viewMode / 设置面板展开)动态调整窗口高度,避免下方空白
  ipcMain.on('window:setSize', (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const { width, height } = payload || {};
    if (typeof width === 'number' && typeof height === 'number') {
      mainWindow.setSize(width, height);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});