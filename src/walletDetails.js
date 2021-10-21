// #region Const Definitions
const {ipcRenderer} = require('electron');
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/walletDetails.log');
const Utils = require('./utils');
// #endregion

// #region Variable Definitions
let utils = new Utils();

let $ = require('jquery');
let fs = require('fs');
let path = require('path');

let walletFile = path.resolve(__dirname, '../resources/config/wallets.json');
let templateFile = path.resolve(__dirname, '../resources/templates/card-template-wallet-detail.html');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

let coinCfg = {};
// #endregion

$(function () {
   addEventListener('keyup', handleKeyPress, true);
});

// #region Page Event Handlers

// ***********************
// Name: 	handleKeyPress
// Purpose: This functions send the event to close the wallet details pane to ipcMain.
//    Args: event
//  Return: N/A
// *************************
function handleKeyPress(event) {
   if (event.key == "Escape") {
      logger.info('Sending close-wallet-details event');
      ipcRenderer.send('close-wallet-details', []);
   }
}

// ***********************
// Name: 	handleWalletDelete
// Purpose: This function handles removing a wallet from the configuration, saving the configuration file and removing it from the screen.
//    Args: wallet - the wallet to remove
//  Return: N/A
// *************************
function handleWalletDelete(wallet) {
   let newWalletObj = [];

   // push wallet values to the new array for all wallets except the one to delete
   walletObj.every((w) => {
      if (w.wallet != wallet) {
         newWalletObj.push({'wallet': w.wallet}); 
      }
      return true;
   });
   
   //write the new wallet file
   fs.writeFile(walletFile, JSON.stringify(newWalletObj, null, '\t'));

   walletObj = newWalletObj;

   //remove the card from the display
   $('#'+wallet+'-card').remove();
}
// #endregion

// #region Wallet Functions

// ***********************
// Name: 	loadAndDisplayWallets
// Purpose: This function is handles clearing and re-adding the wallet cards.
//    Args: N/A
//  Return: N/A
// *************************
function loadAndDisplayWallets() {  
   // clearing any existing wallets
   $('.walletCard').remove();

   logger.info('Loading Wallet Details for ' + coinCfg.coinDisplayName);

   $(document).attr("title", coinCfg.coinDisplayName + " Wallet Details");

   walletObj.every((w) => {
      if (w.wallet.startsWith(coinCfg.coinPrefix)) {
         logger.info('Loading Wallet Details for wallet: ' + w.wallet);
         buildWalletCard(w.wallet, coinCfg)

         ipcRenderer.send('async-get-wallet-balance', [w.wallet, coinCfg.coinPathName]);
      }

      return true;
   });
}

// ***********************
// Name: 	buildWalletCard
// Purpose: This function merges the card template from the resource files with the data from the coin configuration object.  Then, it appends the card elements into the "wallet-cards" div on the page.
//    Args: wallet - The wallet address to show.
//          coinCfg - The coin configuration object.
//  Return: N/A
// *************************
function buildWalletCard(wallet, coinCfg) {
      let updateString = cardTemplate.replace('{0}', wallet).replace('{1}', wallet).replace('{2}', wallet).replace('{3}', coinCfg.coinPrefix);
      
      $('#wallet-cards').append(updateString);
}
// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet detail page renders
// ************************
ipcRenderer.on('load-wallet-details', (event, arg) => {
   logger.info('Received load-wallet-details event');
   
   if (arg.length == 1) {
      coinCfg = arg[0];

      logger.info('Loading details for ' + coinCfg.coinDisplayName);
      loadAndDisplayWallets();
   }
   else {
      logger.error('Reply args incorrect');
   }
})

// ************************
// Purpose: This function receives the wallet balance reply from ipcMain, refreshes the coin data set balances and initiates the card refresh.
// ************************
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-wallet-balance-reply event');
   
   if (arg.length == 4) {
      let wallet = arg[1];
      let balance = (arg[2] / coinCfg.mojoPerCoin);
      let balanceUSD = (coinCfg.coinPrice != null) ? balance * coinCfg.coinPrice : null;
    
      if ($('#'+wallet+'-card .card-text').length != 0) {
         $('#'+wallet+'-card .spinner-border').remove();
         $('#'+wallet+'-card .card-balances').show();

         if (balance != null) {
            $('#'+wallet+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance));
         }
         
         if (balanceUSD != null && balance > 0) {
            $('#'+wallet+'-card .card-body .balance-usd').text(utils.getAdjustedUSDBalanceLabel(balanceUSD));
         }
         else {
            $('#'+wallet+'-card .card-body .balance-usd').text('-');
         }
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
})
// #endregion