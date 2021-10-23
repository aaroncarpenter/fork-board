// #region Constant Definitions
const {
   app,
   BrowserWindow,
   Menu,
   MenuItem,
   ipcMain,
   nativeTheme
} = require('electron')
const url = require('url')
const path = require('path')
const axios = require('axios')
const https = require('https');
const logger = require('electron-log');
//const contextMenu = require('electron-context-menu');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/main.log');
const agent = new https.Agent({
   rejectUnauthorized: false
});
const baseAllTheBlocksApiUrl = "https://api.alltheblocks.net";
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
      }
   })
   win.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
   }))
}
// #endregion

// #region Wallet Details Window
let walletDetails;
let refreshMainCard = false;

function createWalletDetailsWindow(coinCfg) {
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
   }))

   walletDetails.once("show", function () {
      logger.info('Sending load-wallet-details event: ' + coinCfg.coinDisplayName);
      walletDetails.webContents.send("load-wallet-details", [coinCfg]);
   });

   walletDetails.once("ready-to-show", () => {
      logger.info('Ready to show - Wallet Details');
      walletDetails.show();
   });

   walletDetails.on('close', (e) => {
      if (win && refreshMainCard) {
         logger.info('Sending async-refresh-card-display event: ' + coinCfg.coinDisplayName);
         win.webContents.send('async-refresh-card-display', [coinCfg]);
      }
   });
}
// #endregion

// #region NFT Recovery Window
let nftRecovery;

function createNFTRecoveryWindow() {
   nftRecovery = new BrowserWindow({
      width: 900,
      height: 1200,
      modal: true,
      show: false,
      parent: win, // Make sure to add parent window here
      autoHideMenuBar: true,
   });

   nftRecovery.loadURL(url.format({
      pathname: '/nft-recovery',
      protocol: 'https',
      hostname: 'alltheblocks.net'
   }))

   nftRecovery.once("ready-to-show", () => {
      logger.info('Ready to show - NFT Recovery');
      nftRecovery.show();
   });
}
// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function handles the close-wallet-details event from the Renderer.  It closes the Wallet Details page.  This event is used to handle a user hitting "Escape" to close the wallet details.
// ************************
ipcMain.on("close-wallet-details", (event, arg) => {
   logger.info('Received close-wallet-details Event');
   walletDetails.hide();

   logger.info('Sending async-refresh-wallets Event');
   win.webContents.send('async-refresh-wallets', []);
});

ipcMain.on('async-set-dashboard-refresh-flag', (event, arg) => {
   logger.info('Received async-set-dashboard-refresh-flag Event');
   refreshMainCard = true;
});

// ************************
// Purpose: This function handles the open-wallet-details event from the Renderer.  It opens the Wallet Details page for a given coin.
// ************************
ipcMain.on("open-wallet-details", (event, arg) => {
   logger.info('Received open-wallet-details Event');

   if (arg.length == 1) {
      let coinCfg = arg[0];

      logger.info("Create wallet details window for :" + coinCfg.coinDisplayName);

      createWalletDetailsWindow(coinCfg);
   }
});

// ************************
// Purpose: This function handles the open-nft-recovery-site event from the Renderer.  It opens the NFT Recovery page from ATB.
// ************************
ipcMain.on("open-nft-recovery-site", (event, arg) => {
   createNFTRecoveryWindow();
});

// ************************
// Purpose: This function handles the async-get-wallet-balance event from the Renderer.  It retrieves the wallet balance from ATB and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('async-get-wallet-balance', (event, arg) => {
   logger.info('Received async-get-wallet-balance event');

   if (arg.length == 2) {
      let wallet = arg[0];
      let coin = arg[1];
      let url = baseAllTheBlocksApiUrl + "/" + coin + "/address/" + wallet;

      logger.info('Wallet: ' + wallet + ', Coin: ' + coin);

      axios.get(url, {
            httpsAgent: agent
         })
         .then((result) => {
            logger.info('Sending async-get-wallet-balance-reply event');
            event.sender.send('async-get-wallet-balance-reply', [coin, wallet, result.data.balance, result.data.balanceBefore]);
         })
         .catch((error) => {
            logger.error(error);
         });
   }
});

// ************************
// Purpose: This function handles the async-get-blockchain-settings event from the Renderer.  It retrieves the recoverable balances for the launcherid from ATB and sends the reply event with the data to the Renderer. 
// ************************
ipcMain.on('async-get-recoverable-wallet-balance', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance event');

   if (arg.length == 1) {
      let launcherid = arg[0];
      let url = baseAllTheBlocksApiUrl + "/atb/nft/" + launcherid + "/eligible";

      axios.get(url, {
            httpsAgent: agent
         })
         .then((result) => {
            logger.info('Sending async-get-recoverable-wallet-balance-reply event');
            event.sender.send('async-get-recoverable-wallet-balance-reply', result.data);
         })
         .catch((error) => {
            logger.error(error);
         });
   }
});

// ************************
// Purpose: This function handles the async-get-blockchain-settings event from the Renderer.  It retrieves the block chain settings from ATB and sends the reply event with the data to the Renderer.
// ************************
ipcMain.on('async-get-blockchain-settings', (event, arg) => {
   logger.info('Received async-get-blockchain-settings event');

   let url = baseAllTheBlocksApiUrl + "/atb/blockchain/settings";

   axios.get(url, {
         httpsAgent: agent
      })
      .then((result) => {
         logger.info('Sending async-get-blockchain-settings-reply event');
         event.sender.send('async-get-blockchain-settings-reply', result.data);
      })
      .catch((error) => {
         logger.error(error);
      });
});

//https://xchscan.com/api/chia-price

// #endregion

//#region Menu Setup
const template = [{
      label: 'File',
      submenu: [{
            label: 'Set Launcher Id',
            click() {
               win.webContents.send('async-set-launcher', []);
            }
         },
         {
            label: 'Add Wallet',
            click() {
               win.webContents.send('async-add-wallet', []);
            }
         },
         {
            label: 'Refresh',
            click() {
               win.webContents.send('async-refresh-wallets', []);
            }
         },
         {
            label: 'Debug Data',
            click() {
               win.webContents.send('async-populate-debug-data', []);
            }
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
      role: 'help',
      submenu: [{
         label: 'Learn More'
      }]
   }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu);
// #endregion

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
      app.quit();
   }
});

app.on('activate', () => {
   if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
   }
});