// Preload — 通过 contextBridge 暴露最小权限 API 给 renderer
// 当前应用只用 localStorage 存数据,Zustand 已经处理,这里保留一个版本信息通道备将来扩展
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('slackerAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});