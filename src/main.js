// #region Constant Definitions
const {
   app,
   BrowserWindow,
   Menu,
   MenuItem,
   ipcMain,
   dialog,
   nativeImage
} = require('electron');
const url = require('url');
const path = require('path');
const axios = require('axios');
const https = require('https');
const logger = require('electron-log');
logger.transports.file.resolvePath = function () {
   return path.join(__dirname, 'logs/main.log');
};

axios.defaults.timeout = 30000;
axios.defaults.httpsAgent = new https.Agent({ 
   rejectUnauthorized: false,
   keepAlive: true 
});

const baseAllTheBlocksApiUrl = "https://api.alltheblocks.net";
const baseForkBoardApi = "https://fork-board-api-mgmt.azure-api.net";
// #endregion

// quit if startup from squirrel installation.
if (require('electron-squirrel-startup')) return app.quit();

let appIcon = nativeImage.createFromPath('assets/icons/fork-board-gray.png');
let displayTheme;

// #region Main Window
let win;

function createWindow() {
   win = new BrowserWindow({
      width: 1500,
      height: 1200,
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         enableRemoteModule: true
      },
      icon: appIcon
   });
   win.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
   }));
}
// #endregion

// #region Wallet Details Window
let walletDetails;
let refreshMainCard = false;

function createWalletDetailsWindow(coinCfg, displayTheme) {
   logger.info(`Creating the Wallet Details window for ${coinCfg.coinDisplayName}`);
   refreshMainCard = false;
   walletDetails = new BrowserWindow({
      width: 600,
      height: 600,
      modal: true,
      show: false,
      parent: win, // Make sure to add parent window here
      autoHideMenuBar: true,

      // Make sure to add webPreferences with below configuration
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         enableRemoteModule: true
      },
      icon: appIcon
   });

   walletDetails.loadURL(url.format({
      pathname: path.join(__dirname, 'walletDetails.html'),
      protocol: 'file:',
      slashes: true
   }));

   walletDetails.once("show", function () {
      logger.info(`Sending load-wallet-details event: ${coinCfg.coinDisplayName}`);
      walletDetails.webContents.send("load-wallet-details", [coinCfg, displayTheme, process.platform, process.arch]);
   });

   walletDetails.once("ready-to-show", function () {
      logger.info('Ready to show - Wallet Details');
      walletDetails.show();
   });

   walletDetails.on('close', function (_e) {
      if (win && refreshMainCard) {
         logger.info(`Sending async-refresh-card-display event: ${coinCfg.coinDisplayName}`);
         win.webContents.send('async-refresh-card-display', [coinCfg]);
      }
   });
}
// #endregion

// #region About Window
let aboutPage;

function createAboutWindow() {
   logger.info('Creating the About window');
   aboutPage = new BrowserWindow({
      width: 500,
      height: 410,
      modal: true,
      show: false,
      parent: win, // Make sure to add parent window here
      autoHideMenuBar: true,

      // Make sure to add webPreferences with below configuration
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         enableRemoteModule: true
      },
      icon: appIcon
   });

   aboutPage.loadURL(url.format({
      pathname: path.join(__dirname, 'about.html'),
      protocol: 'file:',
      slashes: true
   }));

   aboutPage.once("ready-to-show", function () {
      logger.info('Ready to show - About');
      aboutPage.show();
   });

   aboutPage.once("show", function () {
      logger.info(`Sending load-about-page event`);
      aboutPage.webContents.send("load-about-page", [app.getVersion(), displayTheme, process.platform, process.arch]);
   });
}
// #endregion

// #region Web Page Window
let webPageWin;

function createWebPageWindow(winUrl, winParent, winModal, winWidth = 900, winHeight = 1200) {
   logger.info(`Creating the Web Page window - Url: ${winUrl}, Parent: ${winParent}, Model: ${winModal}, Width: ${winWidth}, Height: ${winHeight}`);
   webPageWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      modal: winModal,
      show: false,
      parent: winParent, // Make sure to add parent window here
      autoHideMenuBar: true,
   });

   webPageWin.loadURL(winUrl);

   webPageWin.once("ready-to-show", function () {
      logger.info('Ready to show - Web Page');
      webPageWin.show();
   });
}
// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function handles the close-wallet-details event from the Renderer.  It closes the Wallet Details page.  This event is used to handle a user hitting "Escape" to close the wallet details.
// ************************
ipcMain.on("close-wallet-details", function (_event, arg) {
   logger.info('Received close-wallet-details Event');
   walletDetails.hide();

   if (arg.length == 1) {
      let coinCfg = arg[0];

      if (win && refreshMainCard) {
         logger.info(`Sending async-refresh-card-display event: ${coinCfg.coinDisplayName}`);
         win.webContents.send('async-refresh-card-display', [coinCfg]);
      }
   }
});

// ************************
// Purpose: This function handles setting the card refresh flag when wallets are deleted from the wallet details page.
// ************************
ipcMain.on('async-set-dashboard-refresh-flag', function (_event, _arg) {
   logger.info('Received async-set-dashboard-refresh-flag Event');
   refreshMainCard = true;
});

// ************************
// Purpose: This function handles setting the card refresh flag when wallets are deleted from the wallet details page.
// ************************
ipcMain.on('close-about-page', function (_event, _arg) {
   logger.info('Received close-about-page Event');
   aboutPage.hide();
});

// ************************
// Purpose: This function handles the open-wallet-details event from the Renderer.  It opens the Wallet Details page for a given coin.
// ************************
ipcMain.on("open-wallet-details", function (_event, arg) {
   logger.info('Received open-wallet-details Event');

   if (arg.length == 2) {
      let coinCfg = arg[0];
      let displayTheme = arg[1];

      logger.info(`Create wallet details window for : ${coinCfg.coinDisplayName}`);
      createWalletDetailsWindow(coinCfg, displayTheme);
   }
});

// ************************
// Purpose: This function handles the open-nft-recovery-site event from the Renderer.  It opens the NFT Recovery page from ATB.
// ************************
ipcMain.on("open-nft-recovery-site", function (_event, arg) {
   logger.info('Received open-nft-recovery-site event');

   let url = "";
   if (arg.length == 1) {
      url = `https://alltheblocks.net/nft-recovery?launcherId=${arg[0]}`;
   }
   else {
      'https://alltheblocks.net/nft-recovery';
   }

   if (process.platform == 'darwin') {
      require('electron').shell.openExternal(url);
   }
   else {
      createWebPageWindow(url, win, true, 900, 1200);
   }
});

// ************************
// Purpose: This function handles the async-get-wallet-balance event from the Renderer.  It retrieves the wallet balance from ATB and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('async-get-wallet-balance', function (event, arg) {
   logger.info('Received async-get-wallet-balance event');

   if (arg.length == 2) {
      let wallet = arg[0];
      let coin = arg[1];
      let url = baseAllTheBlocksApiUrl + "/" + coin + "/address/" + wallet;

      logger.info('Wallet: ' + wallet + ', Coin: ' + coin);

      logger.info(`Requesting data from ${url}`);
      axios.get(url)
      .then(function (result) {
         logger.info('Sending async-get-wallet-balance-reply event');
         event.sender.send('async-get-wallet-balance-reply', [coin, wallet, result.data.balance, result.data.balanceBefore]);
      })
      .catch(function (error) {
         logger.error(error.message);
         event.sender.send('async-get-wallet-balance-error', [error.message, coin, wallet]);
      });
   }
});

// ************************
// Purpose: This function handles the async-get-blockchain-settings event from the Renderer.  It retrieves the recoverable balances for the launcherid from ATB and sends the reply event with the data to the Renderer. 
// ************************
ipcMain.on('async-get-recoverable-wallet-balance', function (event, arg) {
   logger.info('Received async-get-recoverable-wallet-balance event');

   if (arg.length == 1) {
      let launcherId = arg[0];

      let url = `${baseForkBoardApi}/fork-board/recovery?launcherId=${launcherId}`;

      logger.info(`Requesting data from ${url}`);
      axios.get(url)
      .then(function (result) {
         logger.info('Sending async-get-recoverable-wallet-balance-reply event');
         event.sender.send('async-get-recoverable-wallet-balance-reply', result.data);
      })
      .catch(function (error) {
         logger.error(error.message);
         event.sender.send('async-get-recoverable-wallet-balance-error', [error.message, launcherId]);
      });
   }
});

// ************************
// Purpose: This function handles the async-get-blockchain-settings event from the Renderer.  It retrieves the block chain settings from ATB and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('async-get-blockchain-settings', function (event, _arg) {
   logger.info('Received async-get-blockchain-settings event');

   let url = `${baseForkBoardApi}/fork-board/config`;

   logger.info(`Requesting data from ${url}`);
   axios.get(url)
   .then(function (result) {
      logger.info('Sending async-get-blockchain-settings-reply event');
      event.sender.send('async-get-blockchain-settings-reply', result.data);
   })
   .catch(function (error) {
      logger.error(error.message);
      event.sender.send('async-get-blockchain-settings-error', [error.message]);
   });
});

// ************************
// Purpose: This function handles the async-get-fork-prices event from the Renderer.  It retrieves the fork prices from XCHForks.com and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('async-get-fork-prices', function (event, _arg) {
   logger.info('Received async-get-fork-prices event');
 
   let url = `${baseForkBoardApi}/fork-board/price`;

   logger.info(`Requesting data from ${url}`);
   axios.get(url)
   .then(function (result) {
      logger.info('Sending async-get-fork-prices-reply event');
      event.sender.send('async-get-fork-prices-reply', result.data);
   })
   .catch(function (error) {
      logger.error(error.message);
      event.sender.send('async-get-fork-prices-error', [error.message]);
   });
});

// ************************
// Purpose: This function handles the async-get-fork-prices event from the Renderer.  It retrieves the fork prices from XCHForks.com and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('load-main-dashboard', function (event, arg) {
   logger.info('Received load-main-dashboard event');

   if (arg.length == 1) {
      displayTheme = arg[0];
   }

   logger.info('Sending load-main-dashboard-reply event');
   event.sender.send('load-main-dashboard-reply', [app.getVersion(), process.platform, process.arch]);
});
// #endregion

//#region Menu Setup
const template = [
   {
      id: 'fileMenu',
      label: 'File',
      submenu: [
         {
            label: 'Set Launcher Ids',
            click() {
               logger.info('Sending async-set-launcher event');
               win.webContents.send('async-set-launcher', []);
            },
            accelerator: 'Alt+CmdOrCtrl+L'
         },
         {
            label: 'Add Wallet',
            click() {
               logger.info('Sending async-add-wallet event');
               win.webContents.send('async-add-wallet', []);
            },
            accelerator: 'Alt+CmdOrCtrl+A'
         },
         {
            label: 'Refresh',
            click() {
               logger.info('Sending async-refresh-wallets event');
               win.webContents.send('async-refresh-wallets', []);
            },
            accelerator: 'Alt+CmdOrCtrl+R'
         },
         {
            type: 'separator'
         },
         {
            label: 'Backup ForkBoard Settings',
            click() {
               backupWalletConfig();   
            },
            accelerator: 'Alt+CmdOrCtrl+B'
         },
         {
            label: 'Restore ForkBoard Settings',
            click() {
               restoreWalletConfig();
            }
         },
         {
            type: 'separator'
         },
         {
            label: 'Import ForkBoard Wallet Tool Export',
            click() {
               importWalletToolFile();
            },
            accelerator: 'Alt+CmdOrCtrl+I'
         },
         {
            type: 'separator'
         },
         {
            role: 'close'
         }
      ]
   },
   {
      label: 'View',
      submenu: [
         {
            role: 'toggledevtools'
         },
         {
            role: 'reload'
         },
         {
            type: 'separator'
         },
         {
            role: 'resetzoom'
         },
         {
            role: 'zoomin'
         },
         {
            role: 'zoomout'
         },
         {
            type: 'separator'
         },
         {
            role: 'togglefullscreen'
         }
      ]
   },
   {
      label: 'Sponsors',
      submenu: [
         {
            label: 'SpaceFarmers.io',
            click() {
               logger.info('Opening SpaceFarmers.IO page in Browser');
               require("electron").shell.openExternal('https://spacefarmers.io');
            }
         }
      ]
   },
   {
      label: 'Partners',
      submenu: [
         {
            label: 'AllTheBlock.NET',
            click() {
               logger.info('Opening AllTheBlock.NET page in Browser');
               require("electron").shell.openExternal('https://alltheblocks.net');
            }
         },
         {
            type: 'separator'
         },
         {
            label: 'Chia Forks Blockchain',
            click() {
               logger.info('Opening Chia Forks Blockchain page in Browser');
               require("electron").shell.openExternal('https://chiaforksblockchain.com');
            }
         },
         {
            label: 'Forks Chia Exchanger',
            click() {
               logger.info('Opening Forks Chia Exchanger page in Browser');
               require("electron").shell.openExternal('https://forkschiaexchange.com');
            }
         },
         {
            label: 'Casino Maize',
            click() {
               logger.info('Opening Casino Maize page in Browser');
               require("electron").shell.openExternal('https://casino.maize.farm');
            }
         }
      ]
   },
   {
      label: 'About',
      submenu: [
         {
            label: 'ForkBoard Wiki',
            click() {
               logger.info('Opening ForkBoard Wiki in Browser');
               require("electron").shell.openExternal('https://github.com/aaroncarpenter/fork-board/wiki/1.--Home');
            }
         },
         {
            label: 'Contribute on GitHub',
            click() {
               logger.info('Opening ForkBoard Github in Browser');
               require("electron").shell.openExternal('https://github.com/aaroncarpenter/fork-board');
            }
         },
         {
            label: 'Join us on Discord',
            click() {
               logger.info('Opening Discord Invite in Browser');
               require("electron").shell.openExternal('https://discord.gg/pW9nNDt8');
            }
         },
         {
            type: 'separator'
         },
         {
            label: 'Report an Issue',
            click() {
               logger.info('Opening ForkBoard Issues in Browser');
               require("electron").shell.openExternal('https://github.com/aaroncarpenter/fork-board/issues');
            }
         },
         {
            type: 'separator'
         },
         {
            label: 'About ForkBoard',
            click() {
               createAboutWindow();
            }
         }  
      ]
   }
];

const menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);
// #endregion

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.on('window-all-closed', function () {
   if (process.platform !== 'darwin') {
      app.quit();
   }
});

app.on('activate', function () {
   if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
   }
});

function backupWalletConfig() {
   let filePaths = dialog.showOpenDialogSync(win, { 
      title: 'Select a Backup Destination',
      buttonLabel: 'Backup',
      message: 'Please select the location to backup the wallet configuration',
      properties: ['openDirectory'] 
   });

   if (filePaths != undefined) {
         logger.info('Sending async-backup-wallet-config-action event');
         win.webContents.send('async-backup-wallet-config-action', [filePaths[0]]); 
   }
}  

function restoreWalletConfig() {
   let filePaths = dialog.showOpenDialogSync(win, { 
      title: 'Select a Wallet Backup to Restore',
      buttonLabel: 'Restore',
      message: 'Please select the wallet backup file to Restore',
      properties: ['openFile'],
      filters: [
         { name: 'JSON', extensions: ['json'] },
         { name: 'All Files', extensions: ['*'] }
       ] 
   });

   if (filePaths != undefined) {
      logger.info('Sending async-restore-wallet-config-action event');
      win.webContents.send('async-restore-wallet-config-action', [filePaths[0]]); 
   }
}  

function importWalletToolFile() {
   let filePaths = dialog.showOpenDialogSync(win, { 
      title: 'Select a WalletTool File to Import',
      buttonLabel: 'Restore',
      message: 'Please select the wallettool file to Import',
      properties: ['openFile'],
      filters: [
         { name: 'JSON', extensions: ['json'] }
       ] 
   });

   if (filePaths != undefined) {
      logger.info('Sending async-import-wallet-tool-export-action event');
      win.webContents.send('async-import-wallet-tool-export-action', [filePaths[0]]); 
   }
}