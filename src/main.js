// #region Constant Definitions
const {
   app,
   BrowserWindow,
   Menu,
   MenuItem,
   ipcMain,
   nativeTheme
} = require('electron');
const url = require('url');
const path = require('path');
const axios = require('axios');
const https = require('https');
const logger = require('electron-log');
logger.transports.file.resolvePath = function () {
   return path.join(__dirname, 'logs/main.log');
};
const agent = new https.Agent({
   rejectUnauthorized: false
});
const baseAllTheBlocksApiUrl = "https://api.alltheblocks.net";
const baseForkBoardApi = "https://fork-board-api-mgmt.azure-api.net";
// #endregion

// #region Main Window
let win;

function createWindow() {
   win = new BrowserWindow({
      width: 1100,
      height: 1200,
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         enableRemoteModule: true
      },
      icon: path.resolve(__dirname, '../resources/icons/fork-board-gray.png')
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
   });

   walletDetails.loadURL(url.format({
      pathname: path.join(__dirname, 'walletDetails.html'),
      protocol: 'file:',
      slashes: true
   }));

   walletDetails.once("show", function () {
      logger.info(`Sending load-wallet-details event: ${coinCfg.coinDisplayName}`);
      walletDetails.webContents.send("load-wallet-details", [coinCfg, displayTheme]);
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
      height: 500,
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
}
// #endregion

// #region Web Page Window
let webPageWin;

function createWebPageWindow(winProtocol, winHost, winPath, winParent, winModal, winWidth = 900, winHeight = 1200) {
   logger.info(`Creating the Web Page window - Protocol: ${winProtocol}, Host: ${winHost}, Path: ${winPath}, Parent: ${winParent}, Model: ${winModal}, Width: ${winWidth}, Height: ${winHeight}`);
   webPageWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      modal: winModal,
      show: false,
      parent: winParent, // Make sure to add parent window here
      autoHideMenuBar: true,
   });

   webPageWin.loadURL(url.format({
      pathname: winPath,
      protocol: winProtocol,
      hostname: winHost
   }));

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
ipcMain.on("close-wallet-details", function (_event, _arg) {
   logger.info('Received close-wallet-details Event');
   walletDetails.hide();

   logger.info('Sending async-refresh-wallets Event');
   win.webContents.send('async-refresh-wallets', []);
});

// ************************
// Purpose: This function handles setting the card refresh flag when wallets are deleted from the wallet details page.
// ************************
ipcMain.on('async-set-dashboard-refresh-flag', function (_event, _arg) {
   logger.info('Received async-set-dashboard-refresh-flag Event');
   refreshMainCard = true;
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
ipcMain.on("open-nft-recovery-site", function (_event, _arg) {
   logger.info('Received open-nft-recovery-site event');
   createWebPageWindow('https', 'alltheblocks.net', '/nft-recovery', win, true, 900, 1200);
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
      axios.get(url, {
         httpsAgent: agent
      })
      .then(function (result) {
         logger.info('Sending async-get-wallet-balance-reply event');
         event.sender.send('async-get-wallet-balance-reply', [coin, wallet, result.data.balance, result.data.balanceBefore]);
      })
      .catch(function (error) {
         logger.error(error);
      });
   }
});

// ************************
// Purpose: This function handles the async-get-blockchain-settings event from the Renderer.  It retrieves the recoverable balances for the launcherid from ATB and sends the reply event with the data to the Renderer. 
// ************************
ipcMain.on('async-get-recoverable-wallet-balance', function (event, arg) {
   logger.info('Received async-get-recoverable-wallet-balance event');

   if (arg.length == 1) {
      let launcherid = arg[0];

      let url = `${baseForkBoardApi}/fork-board/recovery?launcherId=${launcherid}`;

      logger.info(`Requesting data from ${url}`);
      axios.get(url, {
         httpsAgent: agent
      })
      .then(function (result) {
         logger.info('Sending async-get-recoverable-wallet-balance-reply event');
         event.sender.send('async-get-recoverable-wallet-balance-reply', result.data);
      })
      .catch(function (error) {
         logger.error(error);
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
   axios.get(url, {
      httpsAgent: agent
   })
   .then(function (result) {
      logger.info('Sending async-get-blockchain-settings-reply event');
      event.sender.send('async-get-blockchain-settings-reply', result.data);
   })
   .catch(function (error) {
      logger.error(error);
   });
});

// ************************
// Purpose: This function handles the async-get-fork-prices event from the Renderer.  It retrieves the fork prices from XCHForks.com and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('async-get-fork-prices', function (event, _arg) {
   logger.info('Received async-get-fork-prices event');
 
   let url = `${baseForkBoardApi}/fork-board/price`;

   logger.info(`Requesting data from ${url}`);
   axios.get(url, {
      httpsAgent: agent
   })
   .then(function (result) {
      logger.info('Sending async-get-fork-prices-reply event');
      event.sender.send('async-get-fork-prices-reply', result.data);
   })
   .catch(function (error) {
      logger.error(error);
   });
});
// #endregion

//#region Menu Setup
const template = [
   {
      id: 'fileMenu',
      label: 'File',
      submenu: [{
            label: 'Set Launcher Id',
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
            role: 'close'
         }
      ]
   },
   {
      label: 'Sort',
      submenu: [{
            label: 'Name',
            click() {
               logger.info('Sending set-sort-order (name) event');
               win.webContents.send('async-set-sort-order', ['name']);
            },
            accelerator: 'Alt+CmdOrCtrl+N'
         },
         {
            label: 'USD',
            click() {
               logger.info('Sending set-sort-order (usd) event');
               win.webContents.send('async-set-sort-order', ['usd']);
            },
            accelerator: 'Alt+CmdOrCtrl+U'
         },
         {
            label: 'Coins',
            click() {
               logger.info('Sending set-sort-order (coins) event');
               win.webContents.send('async-set-sort-order', ['coins']);
            },
            accelerator: 'Alt+CmdOrCtrl+C'
         },
         {
            label: 'None',
            click() {
               logger.info('Sending set-sort-order (none) event');
               win.webContents.send('async-set-sort-order', ['none']);
            },
            accelerator: 'Alt+CmdOrCtrl+X'
         }
      ]
   },
   {
      label: 'View',
      submenu: [{
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
      submenu: [{
            label: 'SpaceFarmers.io',
            click() {
               logger.info('Opening SpaceFarmers.IO page in Browser');
               require("electron").shell.openExternal('https://spacefarmers.io');
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
            type: 'separator'
         },
         {
            label: 'Report an Issue',
            click() {
               logger.info('Opening FOrkBoard Issues in Browser');
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

/*
if (!app.isPackaged) {
   let menuItem = menu.getMenuItemById('fileMenu');

   menuItem.submenu.append(new MenuItem({
     label: 'Debug Data',
     click: function () { win.webContents.send('async-populate-debug-data', []); }
   }));
}
*/
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