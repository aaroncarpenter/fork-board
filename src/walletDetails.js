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
let coinConfigFile = path.resolve(__dirname, '../resources/config/coinconfig.json');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
let coinConfigObj = JSON.parse(fs.readFileSync(coinConfigFile, 'utf8'));
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

let coinName = "";

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

   logger.info('Loading Wallet Details for ' + coinName);
   //Check if file exists
   let coinCfg = getCoinConfigForCoin(coinName);

   $(document).attr("title", coinCfg.coinName + " Wallet Details");

   //$('#coinName').text(coinCfg.coinName)

   walletObj.every((w) => {
      if (w.wallet.startsWith(coinCfg.coinSymbol))
      {
         logger.info('Loading Wallet Details for wallet: ' + w.wallet);
         buildWalletCard(w.wallet, coinCfg)

         ipcRenderer.send('async-get-wallet-balance', [w.wallet, coinCfg.coinApiName, coinCfg.multiplier]);
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
      let updateString = cardTemplate.replace('{0}', wallet).replace('{1}', wallet).replace('{2}', wallet).replace('{3}', coinCfg.coinSymbol);
      
      $('#wallet-cards').append(updateString);
}
// #endregion

// #region Coin Configuration

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function getCoinConfigForCoin(coin)
{
   let coinConfig;
   let coinConfigFound = false;
   coinConfigObj.every((cfg) => {
      if (coin == cfg.coinApiName)
      {
         coinConfig = cfg;
         coinConfigFound = true;
         return false;
      }
      else
      {
         return true;
      }
   });

   if (coinConfigFound)
   {
      return coinConfig;
   }
   else
   {
      console.log('Unable to locate coin configuration settings for ' + coin);
   }
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
      coinName = arg[0];
      logger.info('Loading details for ' + coinName);
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
      let coin = arg[0];
      let wallet = arg[1];
      let balance = utils.convertFromMojo(arg[2]);
      let balanceBefore = utils.convertFromMojo(arg[3]);
      let change = balance - balanceBefore;
    
      if ($('#'+wallet+'-card .card-text').length != 0)
      {
         //Remove loading spinner if present
         $('#'+wallet+'-card .spinner-border').remove();

         if (!isNaN(balance))
         {
            $('#'+wallet+'-card .card-text').text(balance.toLocaleString());
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