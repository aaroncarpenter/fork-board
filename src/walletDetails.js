const {ipcRenderer} = require('electron');
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/walletDetails.log');

const Utils = require('./utils');
let utils = new Utils();

let $ = require('jquery');
let fs = require('fs');
let path = require('path');

let walletFile = path.resolve(__dirname, '../resources/config/wallets.json');
let templateFile = path.resolve(__dirname, '../resources/templates/card-template-wallet-detail.html');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

let coinCfg = {};

// #region Page Event Handlers
addEventListener('keyup', handleKeyPress, true);

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function handleKeyPress(event) {
   if (event.key == "Escape")
   {
      logger.info('Sending close-wallet-details event');
      ipcRenderer.send('close-wallet-details', []);
   }
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function handleWalletDelete(wallet)
{
   let newWalletObj = [];

   // push wallet values to the new array for all wallets except the one to delete
   walletObj.every((w) => {
      if (w.wallet != wallet)
      {
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
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function loadAndDisplayWallets() {  
   // clearing any existing wallets
   $('.walletCard').remove();

   logger.info('Loading Wallet Details for ' + coinCfg.coinDisplayName);
   //Check if file exists
   //let coinCfg = getCoinConfigForCoin(coinDisplayName);

   $(document).attr("title", coinCfg.coinDisplayName + " Wallet Details");

   walletObj.every((w) => {
      if (w.wallet.startsWith(coinCfg.coinPrefix))
      {
         logger.info('Loading Wallet Details for wallet: ' + w.wallet);
         buildWalletCard(w.wallet, coinCfg)

         ipcRenderer.send('async-get-wallet-balance', [w.wallet, coinCfg.coinPathName]);
      }

      return true;
   });
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function buildWalletCard(wallet, coinCfg)
{
      let updateString = cardTemplate.replace('{0}', wallet).replace('{1}', wallet).replace('{2}', wallet).replace('{3}', coinCfg.coinPrefix);
      
      $('#wallet-cards').append(updateString);
}
// #endregion

// #region Electron Event Handlers

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
ipcRenderer.on('load-wallet-details', (event, arg) => {
   logger.info('Received load-wallet-details event');
   if (arg.length == 1)
   {
      coinCfg = arg[0];

      logger.info('Loading details for ' + coinCfg.coinDisplayName);
      loadAndDisplayWallets();
   }
   else
   {
      logger.error('Reply args incorrect');
   }
})

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-wallet-balance-reply event');
   if (arg.length == 4)
   {
      let wallet = arg[1];
      let balance = arg[2];
    
      if ($('#'+wallet+'-card .card-text').length != 0)
      {
         //Remove loading spinner if present
         $('#'+wallet+'-card .spinner-border').remove();

         if (!isNaN(balance))
         {
            $('#'+wallet+'-card .card-text').text((balance / coinCfg.mojoPerCoin).toLocaleString());
         }
         else
         {
            logger.error('Numbers in incorrect formats');
         }
      }
   }
   else
   {
      logger.error('Reply args incorrect');
   }
})
// #endregion