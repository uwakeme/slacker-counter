// Preload — 通过 contextBridge 暴露最小权限 API 给 renderer
// 当前应用只用 localStorage 存数据,Zustand 已经处理,这里保留一个版本信息通道备将来扩展
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('slackerAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // 自定义标题栏按钮:renderer 调这些函数,主进程执 IPC
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  // 动态调整窗口尺寸(viewMode 切换 / 设置面板展开收起)
  setWindowSize: (width, height) => ipcRenderer.send('window:setSize', { width, height }),
});