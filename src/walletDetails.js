// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const remote = require('electron').remote;
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, '../logs/walletDetails.log');
const Utils = require('./utils');
const DisplayTheme = {
   Dark: 'Dark',
   Light: 'Light'
};
// #endregion

// #region Variable Definitions
let utils = new Utils();

let $ = require('jquery');
let fs = require('fs');
let path = require('path');

let walletFile = path.resolve(__dirname, '../assets/config/wallets.json');
let templateFile = path.resolve(__dirname, '../assets/templates/card-template-wallet-detail.html');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

let coinCfg = {};
let clientCfg = {};
let exchangeRates = {};
let walletDetailsObj = [];
let displayTheme;
let showCloseButton = false;
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
   if (confirm("Are you sure you want to delete this wallet?"))
   {
      let newWalletObj = [];

      // push wallet values to the new array for all wallets except the one to delete
      walletObj.every(function (w) {
         if (w.wallet != wallet) {
            newWalletObj.push({ 'wallet': w.wallet });
         }
         return true;
      });
      
      //write the new wallet file
      fs.writeFileSync(walletFile, JSON.stringify(newWalletObj, null, '\t'));

      walletObj = newWalletObj;

      // remove the card from the display
      $('#'+wallet+'-card').remove();
 
      ipcRenderer.send('async-set-dashboard-maincard-refresh-flag', []);
   }
}

// ***********************
// Name: 	closeWindow
// Purpose: This function handles specific close button implementation for MacOS
//    Args: N/A
//  Return: N/A
// *************************
function closeWindow() {
   ipcRenderer.send('close-wallet-details', [coinCfg]);
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

   logger.info(`Loading Wallet Details for ${coinCfg.coinDisplayName}`);

   $(document).attr("title", `${coinCfg.coinDisplayName} Wallet Details`);
   $('#wallet-details-title').text(`${coinCfg.coinDisplayName} Wallet Details`);

   walletObj.every(function (w) {
      if (w.wallet.startsWith(coinCfg.coinPrefix)) {
         logger.info(`Loading Wallet Details for wallet: ${w.wallet}`);
         buildWalletCard(w.wallet, w.label, coinCfg);

         ipcRenderer.send('async-get-wallet-balance', [w.wallet, coinCfg, '-1']);
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
function buildWalletCard(wallet, label, coinCfg) {
      if (label == null)
         label = wallet;

      // Replace all of the placeholder text in the template
      let updateString = cardTemplate.replace('{0}', wallet).replace('{1}', label).replace('{2}', wallet).replace('{3}', coinCfg.coinPrefix).replace('{4}', wallet);
      updateString = updateString.replace('{5}', wallet).replace('{6}', wallet).replace('{7}', wallet).replace('{8}', wallet).replace('{9}', wallet).replace('{10}', wallet);
      updateString = updateString.replace('{11}', wallet).replace('{12}', wallet).replace('{13}', wallet).replace('{14}', wallet);

      // Append the element HTML
      $('#wallet-cards').append(updateString);
}

// ***********************
// Name: 	setDisplayTheme
// Purpose: This function sets the display theme
//    Args: N/A
//  Return: N/A
// ************************
function setDisplayTheme() {
   if (clientCfg.appSettings.displayTheme === DisplayTheme.Dark) {
      $('body').addClass('dark-mode');
      $('div.card-body').addClass('dark-mode');
      $('div.card-header').addClass('dark-mode');
      $('div.card-footer').addClass('dark-mode');
      $('div.alert.alert-info').addClass('dark-mode');
      $('div.card').addClass('dark-mode');
   }
   else {
      $('body').removeClass('dark-mode');
      $('div.card-body').removeClass('dark-mode');
      $('div.card-header').removeClass('dark-mode');
      $('div.card-footer').removeClass('dark-mode');
      $('div.alert.alert-info').removeClass('dark-mode');
      $('div.card').removeClass('dark-mode');
   }
}

// ***********************
// Name: 	displayEditBox
// Purpose: This function displays the edit box for the specified wallet card.
//    Args: wallet - The address of the wallet
//  Return: N/A
// ************************
function displayEditBox(wallet)
{
   let existingWalletLabel = '';

   // Iterate through to set the textbox initial value to the existing label
   walletObj.every(function (w) {
      if (w.wallet == wallet && w.label != null) {
         existingWalletLabel = w.label;
      }

      return true;
   });

   // Use wallet address if a label attrobute isn't found.
   if (existingWalletLabel.length == 0) {
      existingWalletLabel = wallet;
   }

   // Set the value
   $('#'+wallet+'-card-label-edit-text-box').val(existingWalletLabel);

   // Show the edit fields
   toggleEditBox(wallet, true);
   
}

// ***********************
// Name: 	toggleEditBox
// Purpose: This function toggles the edit box after save or cancel.
//    Args: wallet - The address of the wallet
//          show - boolean indicating whether to show/hide the edit box
//  Return: N/A
// ************************
function toggleEditBox(wallet, show)
{
   if ($('#'+wallet+'-card-label').length != 0) {

      if (show)
      {
         $('#'+wallet+'-card-label').hide();
         $('#'+wallet+'-card-action').hide();
         $('#'+wallet+'-card-label-edit').show();
         $('#'+wallet+'-card-label-action').show();
      }
      else
      {
         $('#'+wallet+'-card-label').show();
         $('#'+wallet+'-card-action').show();
         $('#'+wallet+'-card-label-edit').hide();
         $('#'+wallet+'-card-label-action').hide();
      }
   }
}

// ***********************
// Name: 	saveLabelUpdate
// Purpose: This function saves the updated label into the configuration file.
//    Args: wallet - The address of the wallet
//  Return: N/A
// ************************
function saveLabelUpdate(wallet)
{
   logger.info(`Saving label for Wallet: ${wallet}`);
   if ($('#'+wallet+'-card-label-edit-text-box').length != 0) {
      let updatedLabel = $('#'+wallet+'-card-label-edit-text-box').val();

      if (updatedLabel.length > 0)
      {
         walletObj.every(function (w) {
            if (w.wallet == wallet) {
               w.label = updatedLabel;
            }
      
            return true;
         });

         // Update the existing static field.
         $('#'+wallet+'-card-label').html(`<small>${updatedLabel}&nbsp;&nbsp;&nbsp;&nbsp;</small>`);

         //hide the Edit controls.
         toggleEditBox(wallet, false);         
      }
      
      storeWalletSettings();
   }
}

// ***********************
// Name: 	copyWalletAddress
// Purpose: This function copies the wallet address to the clipboard
//    Args: wallet - The address of the wallet
//  Return: N/A
// ************************
function copyWalletAddress(wallet)
{
   clipboard.writeText(wallet);
}

// ***********************
// Name: 	storeWalletSettings
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function storeWalletSettings() {
   fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));
}

// ***********************
// Name: 	deleteAllWallets
// Purpose: This function handles deleting all wallets for a particular coin.  It functions similarly to the inidividual wallet delete function.
//    Args: N/A
//  Return: N/A
// ************************
function deleteAllWallets() {
   if (confirm(`Are you sure you want to delete ${walletDetailsObj.length} wallet(s)?`))
   {
      walletDetailsObj.every(function (wdo) {
         let newWalletObj = [];

         // Push wallet values to the new array for all wallets except the one to delete
         walletObj.every(function (w) {
            if (w.wallet != wdo.wallet) {
               newWalletObj.push({ 'wallet': w.wallet });
            }
            return true;
         });
      
         walletObj = newWalletObj;

         // Remove the card from the display
         $(`#${wdo.wallet}-card`).remove();
 
         return true;
      });
      
      // Write the new wallet file
      fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));

      // This flag tells the main dashboard there was a change and forces a refresh.
      ipcRenderer.send('async-set-dashboard-maincard-refresh-flag', []);

      // Auto-close the window after removing all wallets.
      closeWindow();
   }
}

// ***********************
// Name: 	deleteZeroBalanceWallets
// Purpose: This function handles deleting all zero balance wallets for a particular coin.  It functions similarly to the inidividual wallet delete function.
//    Args: N/A
//  Return: N/A
// ************************
function deleteZeroBalanceWallets() {
   let zeroBalanceWalletCount = 0;

   // Iterate through the wallet details list to get the number of wallets with zero balances.
   walletDetailsObj.every(function (wdo) {
      if (wdo.balance == 0)
      {
         zeroBalanceWalletCount = zeroBalanceWalletCount + 1;
      }

      return true;
   });

   if (confirm(`Are you sure you want to delete ${zeroBalanceWalletCount} wallet(s)?`))
   {
      walletDetailsObj.every(function (wdo) {
         if (wdo.balance == 0)
         { 
            let newWalletObj = [];

            // Push wallet values to the new array for all wallets except the one to delete
            walletObj.every(function (w) {
               if (w.wallet != wdo.wallet) {
                  newWalletObj.push({ 'wallet': w.wallet });
               }
               return true;
            });
         
            walletObj = newWalletObj;

            // Remove the card from the display
            $(`#${wdo.wallet}-card`).remove();
         }
         return true;
      });
      
      // Write the new wallet file
      fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));

      // This flag tells the main dashboard there was a change and forces a refresh.
      ipcRenderer.send('async-set-dashboard-maincard-refresh-flag', []);

      // Auto-close the window after removing all wallets.
      closeWindow();
   }
}

// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet detail page renders
// ************************
ipcRenderer.on('load-wallet-details', (event, arg) => {
   logger.info('Received load-wallet-details event');
   
   if (arg.length == 5) {
      coinCfg = arg[0];
      clientCfg = arg[1];
      exchangeRates = arg[2];
      let processPlatform = arg[3];
      let processArch = arg[4];

      logger.info(`Loading details for ${coinCfg.coinDisplayName}`);
      loadAndDisplayWallets();

      //Setting theme
      setDisplayTheme();

      if (processPlatform != 'darwin') {
         $('#close-button-div').hide();
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
});

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
            $('#'+wallet+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance, clientCfg.appSettings.decimalPlaces));
            $('#'+wallet+'-card .card-body .balance').prop('title', balance);
         }

         $('#'+wallet+'-card #balance-currency-label').text(clientCfg.appSettings.currency.toLowerCase());

         if (balanceUSD != null && balance > 0) {
            $('#'+wallet+'-card .card-body .balance-currency').text(utils.getAdjustedCurrencyBalanceLabel(balanceUSD, clientCfg.appSettings.currency, exchangeRates));
         }
         else {
            $('#'+wallet+'-card .card-body .balance-currency').text('-');
         }

         walletDetailsObj.push({ 'wallet': wallet, 'balance': balance });
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
});
// #endregion