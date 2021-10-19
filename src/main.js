const {app, BrowserWindow, Menu, MenuItem, ipcMain} = require('electron') 
const url = require('url') 
const path = require('path')  
const axios = require('axios')
const https = require('https');
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/main.log');
const agent = new https.Agent({rejectUnauthorized: false});
let baseAllTheBlocksApiUrl = "https://api.alltheblocks.net";

// #region Main Window
let win
function createWindow() { 
   win = new BrowserWindow({
      width: 1100, 
      height: 1100,
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         enableRemoteModule: true
       }}) 
   win.loadURL(url.format ({ 
      pathname: path.join(__dirname, 'index.html'), 
      protocol: 'file:', 
      slashes: true 
   })) 
}
// #endregion

// #region Wallet Details Window
let walletDetails
function createWalletDetailsWindow(coin) {
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
   
   walletDetails.loadURL(url.format ({ 
      pathname: path.join(__dirname, 'walletDetails.html'), 
      protocol: 'file:', 
      slashes: true 
   })) 

   walletDetails.once("show", function() {
      logger.info('Sending load-wallet-details event: ' + coin);
      walletDetails.webContents.send("load-wallet-details", [coin]);
    });

   walletDetails.once("ready-to-show", () => {
      logger.info('Ready to show - Wallet Details');
      walletDetails.show();
   });
}
// #endregion

// #region NFT Recovery Window
let nftRecovery
function createNFTRecoveryWindow() {
   nftRecovery = new BrowserWindow({
     width: 900,
     height: 1100,
     modal: true,
     show: false,
     parent: win, // Make sure to add parent window here
     autoHideMenuBar: true,
   });
   
   nftRecovery.loadURL(url.format ({ 
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
ipcMain.on("close-wallet-details", (event, arg) => {
   logger.info('Received close-wallet-details Event');
   walletDetails.hide();

   logger.info('Sending async-refresh-wallets Event');
   win.webContents.send('async-refresh-wallets', []);
});

ipcMain.on("open-wallet-details", (event, arg) => {
   logger.info('Received open-wallet-details Event');
   if (arg.length == 1)
   {  
      let coin = arg[0];

      logger.info("Create wallet details window for :" + coin);
      
      createWalletDetailsWindow(coin);
   }
});

ipcMain.on("open-nft-recovery-site", (event, arg) => {
   createNFTRecoveryWindow();
});

ipcMain.on('async-get-wallet-balance', (event, arg) => {
   logger.info('Received async-get-wallet-balance event');
   if (arg.length == 3)
   {
      let wallet = arg[0];
      let coin = arg[1];
      let multiplier = arg[2];
      let url = baseAllTheBlocksApiUrl + "/" + coin + "/address/" + wallet;

      logger.info('Wallet: ' + wallet + ', Coin: ' + coin + ', Multiplier: ' + multiplier); 

      axios.get(url, { httpsAgent: agent })
      .then((result) => {
         logger.info('Sending async-get-wallet-balance-reply event');
         event.sender.send('async-get-wallet-balance-reply', [coin, wallet, result.data.balance*multiplier, result.data.balanceBefore*multiplier]);
      })
      .catch((error) => {
         logger.error(error);
      });
   }
});

ipcMain.on('async-get-recoverable-wallet-balance', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance event');
   if (arg.length == 1)
   {
      let launcherid = arg[0];
      let url = baseAllTheBlocksApiUrl + "/atb/nft/" + launcherid + "/eligible";

      axios.get(url, { httpsAgent: agent })
      .then((result) => {
         logger.info('Sending async-get-recoverable-wallet-balance-reply event');
         event.sender.send('async-get-recoverable-wallet-balance-reply', result.data);
      })
      .catch((error) => {
         logger.error(error);
      });
   }
});
//https://xchscan.com/api/chia-price

// #endregion

//#region Menu Setup
const template = [
   {
      label: 'File',
      submenu: [
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
      role: 'help',
      submenu: [
         {
            label: 'Learn More'
         }
      ]
   }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu);
// #endregion

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on ('ready', createWindow);

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