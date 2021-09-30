const {app, BrowserWindow, Menu, MenuItem} = require('electron') 
const url = require('url') 
const path = require('path')  
const {ipcMain} = require('electron')
const axios = require('axios')

let win  

function createWindow() { 
   win = new BrowserWindow({width: 1000, height: 800}) 
   win.loadURL(url.format ({ 
      pathname: path.join(__dirname, 'index.html'), 
      protocol: 'file:', 
      slashes: true 
   })) 
}  

// Event handler for asynchronous incoming messages
ipcMain.on('async-get-wallet-balance', (event, arg) => {
   if (arg.length == 3)
   {
      let wallet = arg[0];
      let coinSymbol = arg[1];
      let multiplier = arg[2];
      let baseUrl = "https://api.alltheblocks.net";
      let url = baseUrl + "/" + coinSymbol + "/address/" + wallet;

      //console.log('Wallet: ' + wallet + ', Coin: ' + coinSymbol + ', Multiplier: ' + multiplier); 

      axios.get(url).then((result) => {
         //console.log('Balance: ' + convertFromMojo(result.data.balance)*multiplier); 
         event.sender.send('async-get-wallet-balance-reply', [coinSymbol, convertFromMojo(result.data.balance)*multiplier]);
    });
   }
});

ipcMain.on('async-get-pending-recovery-balance', (event, arg) => {
   if (arg.length == 1)
   {
      //https://api.alltheblocks.net/atb/nft/{0}/eligible
      let launcherid = arg[0];
      let baseUrl = "https://api.alltheblocks.net";
      let url = baseUrl + "/atb/nft/" + launcherid + "/eligible";

      axios.get(url).then((result) => {
         event.sender.send('async-get-pending-recovery-balance-reply', result.data);
    });
   }
});

function convertFromMojo(mojoValue)
{
      return mojoValue/1000000000000;
}

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
      label: 'Display',
      submenu: [
         {
            label: 'Show Actual Wallet Balances',
            click() {
               win.webContents.send('async-show-actual-wallet-balance', []);
            }
         },
         {
            label: 'Show Recoverable Wallet Balances',
            click() {
               win.webContents.send('async-show-recoverable-wallet-balance', []);
            }
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
app.on('ready', createWindow);