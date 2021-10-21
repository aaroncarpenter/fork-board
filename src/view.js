// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const Utils = require('./utils');
const coinImgPath = 'https://assets.alltheblocks.net/icons/forks_big/{0}.png';
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/view.log');
const DisplayMode = {
   Actual: 'Actual',
   Recoverable: 'Recoverable'
 };
// #endregion

// #region Variable Definitions
let $ = require('jquery');
let fs = require('fs');
let path = require('path');

let walletFile = path.resolve(__dirname, '../resources/config/wallets.json');
let templateFile = path.resolve(__dirname, '../resources/templates/card-template-dashboard.html');
let coinPriceFile = path.resolve(__dirname, '../resources/config/coinprices.json');
let clientConfigFile = path.resolve(__dirname, '../resources/config/clientconfig.json');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');

// write empty file if wallets file is missing.
if (!fs.existsSync(walletFile)) {
   fs.writeFileSync(walletFile, '[]');
}
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

// write empty file if wallets file is missing.
if (!fs.existsSync(clientConfigFile)) {
   fs.writeFileSync(clientConfigFile, '{}'); 
}
let clientConfigObj = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));

let coinPriceObj = JSON.parse(fs.readFileSync(coinPriceFile, 'utf8'));

let displayMode = DisplayMode.Actual;
let walletCache = new Set();
let utils = new Utils();

let coinConfigObj = [];
let coinData = [];   
let lastRefreshed = new Date();
let refreshTimerLength = 5*60*60; // 5 minutes
let refreshTimerId;
// #endregion


$(function () {
   getBlockchainSettingsConfiguration();
   addEventListener('keyup', handleKeyPress, true);
});

// #region Page Event Handlers
// ***********************
// Name: 	handleKeyPress
// Purpose: This function runs when the Enter key is pressed to make entering the wallet information easier.
//    Args: event
//  Return: N/A
// ************************
function handleKeyPress(event) {
   if (event.key == "Enter") {
      let walletVal = $('#Wallet').val();

      if (walletVal.length != 0) {
         addNewWallet();
      }
   }

   if (event.key == "Enter") {
      let walletVal = $('#Wallet').val();

      if (walletVal.length != 0) {
         addNewWallet();
      }
   }
}

// ***********************
// Name: 	autoRefreshHandler
// Purpose: This method handles handles chanages to the auto-refresh switch, activating/deactivating the timer object that refreshes the screen
//    Args: N/A
//  Return: N/A
// ************************
function autoRefreshHandler() {
   if ($('#autoRefreshCheck')[0].checked) {
      refreshTimerId = setInterval(refreshDashboard, refreshTimerLength);
   }
   else {
      clearInterval(refreshTimerId);
      // release our intervalID from the variable
      refreshTimerId = null; 
   }
}

$('#show-dark-mode').on('click', () => {
   ipcRenderer.send('dark-mode-toggle', []);
})

$('#show-light-mode').on('click', () => {
   ipcRenderer.send('dark-mode-toggle', []);
})

$('#check-add-wallet').on('click', () => {
   addNewWallet();
})

$('#cancel-add-wallet').on('click', () => {
   $('#add-wallet').hide();
})

$('#add-launcher').on('click', () => {
   saveLauncherId();
})

$('#cancel-add-launcher').on('click', () => {
   $('#set-launcher').hide();
})

$('#show-actual-balance').on('click', () => {
   if (displayMode != DisplayMode.Actual) {
      displayMode = DisplayMode.Actual;
      $('#show-recoverable-balance').addClass('btn-secondary');
      $('#show-recoverable-balance').removeClass('btn-primary');
      $('#show-actual-balance').addClass('btn-primary');
      $('#show-actual-balance').removeClass('btn-secondary');
      getWalletBalances();
   }
})

$('#show-recoverable-balance').on('click', () => {
   if (displayMode != DisplayMode.Recoverable) {
      if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0) {
         displayMode = DisplayMode.Recoverable
         $('#show-actual-balance').addClass('btn-secondary');
         $('#show-actual-balance').removeClass('btn-primary');
         $('#show-recoverable-balance').addClass('btn-primary');
         $('#show-recoverable-balance').removeClass('btn-secondary');
         getWalletRecoverableBalances();
      }
      else {
         $('#set-launcher').show();
      }
   }
})

$('#open-nft-recovery').on('click', () => {
   $('#nft-recovery').hide();
   openNFTRecoverySite();
})
// #endregion

// ***********************
// Name: 	saveLauncherId
// Purpose: This function saves the launcherid entered into the input box
//    Args: N/A
//  Return: N/A
// ************************
function saveLauncherId() {
   $('#set-launcher').hide();
   
   let launcherVal = $('#Launcher').val();

   clientConfigObj.launcherid = launcherVal;
   
   fs.writeFileSync(clientConfigFile, JSON.stringify(clientConfigObj, null, '\t'));

   // Render the Recoverable balances if they are being shown
   if (displayMode === DisplayMode.Recoverable)
   {
      getWalletRecoverableBalances();
   }
}

// ***********************
// Name: 	addNewWallet
// Purpose: This function adds a new wallet into the dashboard, saves the updated configuration and initiates the other processes to get the balance information.
//    Args: N/A
//  Return: N/A
// ************************
function addNewWallet() {
   $('#add-wallet').hide();
   
   let walletVal = $('#Wallet').val();
   let walletArr = walletVal.split(',');

   if (walletVal.length > 0) {
      walletArr.every((walletStr) => {
         walletStr = walletStr.trim();
         let coinCfg = getCoinConfigForWallet(walletStr);

         if (coinCfg != null) {
            if (!walletCache.has(walletStr)) {
               walletObj.push({'wallet': walletStr});
               addEntry(walletStr, (displayMode === DisplayMode.Actual));
               fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));
            }
            else {
               utils.showErrorMessage(logger, "The wallet (" + walletStr + ") already exists.", 5000);
            }
         }
         else {
            utils.showErrorMessage(logger, "The wallet is currently unsupported.  You entered (" + walletStr + ").", 5000);
         }

         return true;
      });
   }

   // Clear the value for the next entry
   $('#Wallet').val(null);
}

// ***********************
// Name: 	loadWalletDetails
// Purpose: This event runs when a user clicks on a card.  It sends an event to ipcMain to display and render the wallet details page.
//    Args: coin - the pathname of the coin to load
//  Return: N/A
// ************************
function loadWalletDetails(coin) {
   // Get configuration for the specified coin
   let coinCfg = getCoinConfigForCoin(coin);


   // Send the event to ipcMain to open the details page.
   logger.info('Sending open-wallet-details event');
   ipcRenderer.send('open-wallet-details', [coinCfg]);
}

// ***********************
// Name: 	openNFTRecoverySite
// Purpose: This function copies the LauncherId into the Clipboard and then sends an event to ipcMain to display the NFT Recovery page.
//    Args: N/A
//  Return: N/A
// ************************
function openNFTRecoverySite() {
   // Copy the LauncherId from configuration to the Clipboard
   clipboard.writeText(clientConfigObj.launcherid);

   // Send the event to ipcMain to open the nft recovery page.
   logger.info('Sending open-nft-recovery-site event');
   ipcRenderer.send('open-nft-recovery-site', [clientConfigObj.launcherid]);
}

// ***********************
// Name: 	addEntry
// Purpose: This function gets the config for a given wallet, renders the card if necessary and emits the event to refresh the card balance if needed.
//    Args: wallet - The wallet to be added
//          loadBalance - A flag indicating whether to load the balance in new cards.
//  Return: N/A
// ************************
function addEntry(wallet, loadBalance) {
   if (wallet) {
      let coinCfg = getCoinConfigForWallet(wallet);

      if (coinCfg != null) {
         walletCache.add(wallet);
         let coinCfg = getCoinConfigForWallet(wallet);
         buildWalletCard(coinCfg)

         if (loadBalance) {
            logger.info('Sending async-get-wallet-balance event');
            ipcRenderer.send('async-get-wallet-balance', [wallet, coinCfg.coinPathName]);
         }
      }
      else {
         logger.error("Unable to Add Entry for unsupported wallet (" + walletStr + ").");
      }
   }
}

// ***********************
// Name: 	refreshDashboard
// Purpose: The main function for refreshing the dashboard.
//    Args: N/A
//  Return: N/A
// ************************
function refreshDashboard() {
   getBlockchainSettingsConfiguration();

   if (displayMode === DisplayMode.Actual) {
      getWalletBalances();
   }
   else {
      getWalletRecoverableBalances();
   }
}

// ***********************
// Name: 	loadAndDisplayWallets
// Purpose: This function is handles clearing and re-adding cards during refreshes.
//    Args: loadBalance - a flag indicating whether to load the balance in new cards.
//  Return: N/A
// ************************
function loadAndDisplayWallets(loadBalance) {  
   //clear the wallet cache
   walletCache.clear();

   //Check if file exists
   if(fs.existsSync(walletFile)) {
      walletObj.every((w) => {
         addEntry(w.wallet, loadBalance);

         return true;
      });
   }

   // Show the last time the dashboad was refreshed.
   if (walletCache.size > 0) {
      lastRefreshed = new Date();
      $('#lastRefreshDate small').show();
      $('#lastRefreshDate small').text('Refreshed On: ' + lastRefreshed.toLocaleString());
   }
}

// #region Coin Dataset Operations

// ***********************
// Name: 	initializeCoinDataSet
// Purpose: This function iniitalizes the coinDataObj based the coinConfigObj.
//    Args: N/A
//  Return: N/A
// ************************
function initializeCoinDataSet() {
   coinData = [];

   coinConfigObj.every((cfg) => {
      coinData.push({
         coinPrefix: cfg.coinPrefix,
         coinPathName: cfg.coinPathName,
         coinDisplayName: cfg.coinDisplayName,
         mojoPerCoin: cfg.mojoPerCoin,
         coinPrice: cfg.coinPrice,
         coinBalance: 0,
         coinBalanceUSD: 0,
         coinChange: 0,
         coinRecovBalance: 0,
         coinRecovBalanceUSD: 0,
         coinWalletCount: 0
      })

      return true;
   });
}

// ***********************
// Name: 	updateCoinDataSetBalance
// Purpose: This function updates the balance attributes for a coin in the coinDataObj and returns the object to the caller.
//    Args: coin - The coin path name to be updated.
//          balance - The updated wallet balance.
//          change - The change in the wallet balance over the last 24 hours.
//  Return: The coinDataObj with the dated values.
// ************************
function updateCoinDataSetBalance(coin, balance, change) {
   let coinDataObj = {};
   if (!isNaN(balance) && !isNaN(change)) {
      coinData.every((c) => {
         if (c.coinPathName === coin) {
            c.coinBalance = c.coinBalance + (balance / c.mojoPerCoin);
            c.coinChange = c.coinChange + (change / c.mojoPerCoin);
            c.coinBalanceUSD = (c.coinPrice != null) ? c.coinBalance * c.coinPrice : null;
            c.coinWalletCount++;
            
            coinDataObj = c;

            return false;
         }

         return true;
      });
   }

   return coinDataObj;
}

// ***********************
// Name: 	updateCoinDataSetRecoverableBalance
// Purpose: This function updates the recoverable balance attributes for a coin in the coinDataObj and returns the object to the caller.
//    Args: coin - The coin path name to be updated.
//          balance - The updated wallet balance.
//  Return: The coinDataObj with the dated values.
// ************************
function updateCoinDataSetRecoverableBalance(coin, balance) {
   let coinDataObj = {};

   if (!isNaN(balance)) {
      coinData.every((c) => {
         if (c.coinPathName === coin) {
            c.coinRecovBalance = (balance / c.mojoPerCoin);
            c.coinRecovBalanceUSD = (c.coinPrice != null) ? c.coinRecovBalance * c.coinPrice : null;

            coinDataObj = c;

            return false;
         }

         return true;
      });
   }

   return coinDataObj;
}
// #endregion

// #region Configuration

// ***********************
// Name: 	getBlockchainSettingsConfiguration
// Purpose: This function sends the 'async-get-blockchain-settings' event to ipcMain to begin retrieving the block chain metadata.
//    Args:  N/A
//  Return:  N/A
// ************************
function getBlockchainSettingsConfiguration() {
   ipcRenderer.send('async-get-blockchain-settings', []);
}

// ***********************
// Name: 	getCoinConfigForWallet
// Purpose: Retrieves the coin configuration object for a given wallet.
//    Args: wallet - the wallet address
//  Return:  N/A
// ************************
function getCoinConfigForWallet(wallet) {
   let coinCfg;
   let coinCfgFound = false;
   coinConfigObj.every((cfg) => {
      if (wallet.startsWith(cfg.coinPrefix)) {
         coinCfg = cfg;
         coinCfgFound = true;
         return false;
      }
      else {
         return true;
      }
   });

   if (coinCfgFound) {
      return coinCfg;
   }
   else {
      logger.error('Unable to locate coin configuration settings for ' + wallet);
   }
}

// ***********************
// Name: 	getCoinConfigForCoin
// Purpose: Retrieves the coin configuration object for a coin path.
//    Args: coin - the pathname of the coin
//  Return: N/A
// ************************
function getCoinConfigForCoin(coin) {
   let coinCfg;
   let coinCfgFound = false;
   coinConfigObj.every((cfg) => {
      if (coin == cfg.coinPathName) {
         coinCfg = cfg;
         coinCfgFound = true;
         return false;
      }
      else {
         return true;
      }
   });

   if (coinCfgFound) {
      return coinCfg;
   }
   else {
      logger.error('Unable to locate coin configuration settings for ' + wallet);
   }
}

// ***********************
// Name: 	getPriceForCoinPrefix
// Purpose: Retrieves the coin configuration object for a coin prefix.
//    Args: coinPrefix - the prefix of the coin
//  Return: N/A
// ************************
function getPriceForCoinPrefix(coinPrefix) {
   let price;
   coinPriceObj.every((cp) => {
      if (coinPrefix == cp.coinPrefix.toLowerCase()) {
         price = cp.usd;
         return false;
      }
      else {
         return true;
      }
   });

   return price;
}
// #endregion

// #region Wallet Functions

// ***********************
// Name: 	buildWalletCard
// Purpose: This function merges the card template from the resource files with the data from the coin configuration object.  Then, it appends the card elements into the "wallet-cards" div on the page.
//    Args: coinCfg - The coin configuration object
//  Return: N/A
// ************************
function buildWalletCard(coinCfg) {
   let imgPath = coinImgPath.replace('{0}', coinCfg.coinPathName);
   
   let updateString = cardTemplate.replace('{0}', coinCfg.coinDisplayName).replace('{1}', coinCfg.coinPathName).replace('{2}', imgPath).replace('{3}', coinCfg.coinPathName).replace('{4}', coinCfg.coinPrefix).replace('{5}', coinCfg.coinPathName);

   if ($('#'+coinCfg.coinPathName+'-card').length == 0) {
      $('#wallet-cards').append(updateString);
   }
}

// ***********************
// Name: 	getWalletBalances
// Purpose: This function is used to refresh all of the cards on the actual wallet balance page.
//    Args: N/A 
//  Return: N/A
// ************************
function getWalletBalances() {
   $('#nft-recovery').hide();

   // Remove all existing cards
   $('.walletCard').remove();

   initializeCoinDataSet();

   // Reload the config data from wallet objects
   walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

   loadAndDisplayWallets(true);
}

// ***********************
// Name: 	getWalletRecoverableBalances
// Purpose: This function is used to refresh all of the cards on the recoverable wallet balance page.
//    Args: N/A
//  Return: N/A
// ************************
function getWalletRecoverableBalances() {
   $('#nft-recovery').hide();

   initializeCoinDataSet();

   if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0) {
      $('.walletCard').remove();

      loadAndDisplayWallets(false);

      // No Pending Balance to be displayed for Chia
      coinConfigObj.every((cfg) => {
         if (cfg.coinPathName == 'chia' || cfg.coinPathName == 'cryptodoge' || cfg.coinPathName == 'tad') {
            $('#'+cfg.coinPathName+'-card .spinner-border').remove();
            $('#'+cfg.coinPathName+'-card .card-text').text('N/A');
         }
         return true;
      });

      logger.info('Sending async-get-recoverable-wallet-balance event')
      ipcRenderer.send('async-get-recoverable-wallet-balance', [clientConfigObj.launcherid]);
   }
   else {
      utils.showErrorMessage(logger, "Unable to get recoverable balances.  Unable to retrieve your launcherid.", 5000);
   }
}
// #endregion

// #region Card Operations

// ***********************
// Name: 	refreshCardData
// Purpose: This function updates the card data displayed on the screen, typically after balance information events are received from ipcMain.
//    Args: cardDataObj - the card data object containing all of the coin information
//  Return: N/A
// ************************
function refreshCardData(cardDataObj) {
   let coin = cardDataObj.coinPathName;
   let balance = (displayMode === DisplayMode.Actual) ? cardDataObj.coinBalance : cardDataObj.coinRecovBalance;
   let balanceUSD = (displayMode === DisplayMode.Actual) ? cardDataObj.coinBalanceUSD : cardDataObj.coinRecovBalanceUSD;
   let change = cardDataObj.coinChange;
   let walletCount = cardDataObj.coinWalletCount;

   const pos_chg_icon = '<span style="color: green"><i class="fas fa-caret-up"></i></span>';
   const neg_chg_icon = '<span style="color: red"><i class="fas fa-caret-down"></i></span>';

   if ($('#'+coin+'-card .card-text').length != 0) {
      // Remove loading spinner if present
      $('#'+coin+'-card .spinner-border').remove();
      $('#'+coin+'-card .card-balances').show();

      // Update the balance
      if (balance != null) {
         $('#'+coin+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance));
      }
      
      // Update the balance in USD, set to '-' if price information isn't available
      if (balanceUSD != null && balance > 0) {
         $('#'+coin+'-card .card-body .balance-usd').text(utils.getAdjustedUSDBalanceLabel(balanceUSD));
      }
      else {
         $('#'+coin+'-card .card-body .balance-usd').text('-');
      }

      if (displayMode === DisplayMode.Actual) {
         $('#'+coin+'-card #walletCount').text(Number(walletCount));
         $('#'+coin+'-card #walletCountLabel').text(" wallet" + ((walletCount > 1) ? "s" : ""));

         // Remove any existing balance change symbol
         $('#'+coin+'-card .balanceChangeSymbol span').remove();

         if (change > 0) {
            $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
            $('#'+coin+'-card .balanceChangeSymbol').append(pos_chg_icon);
         }
         else if (change < 0) {
            $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
            $('#'+coin+'-card .balanceChangeSymbol').append(neg_chg_icon); 
         }
         else
         $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
      }
      else if (displayMode === DisplayMode.Recoverable) {
         $('#nft-recovery').show();
      }
   }
}
// #endregion

// #region Async Event Handlers

// ************************
// Purpose: This function receives the blockchain settings reply from ipcMain and loads the dashboard
// ************************
ipcRenderer.on('async-get-blockchain-settings-reply', (event, arg) => {
   logger.info('Received async-get-blockchain-settings-reply event')
   
   if (arg.length > 0) {
      // Push data from args into the coinConfigObj
      arg.every((blockSettings) => {
         coinConfigObj.push({
            coinPrefix: blockSettings.coinPrefix,
            coinPathName: blockSettings.pathName,
            coinDisplayName: blockSettings.displayName,
            mojoPerCoin: blockSettings.mojoPerCoin,
            coinPrice: getPriceForCoinPrefix(blockSettings.coinPrefix)
         });

         return true;
      });

      $('#pageLoadingSpinner').remove();

      initializeCoinDataSet();

      loadAndDisplayWallets(true);
   }
   else {
      logger.error('Reply args incorrect');
   }
})

// ************************
// Purpose: This function receives the wallet balance reply from ipcMain, refreshes the coin data set balances and initiates the card refresh.
// ************************
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-wallet-balance-reply event')
   
   if (arg.length == 4) {
      let coin = arg[0];
      let balance = arg[2];
      let balanceBefore = arg[3];
      let change = balance - balanceBefore;

      let cardDataObj = updateCoinDataSetBalance(coin, balance, change);

      refreshCardData(cardDataObj);    
   }
   else {
      logger.error('Reply args incorrect');
   }
})

// ************************
// Purpose: This function receives the recoverable wallet balance reply from ipcMain, refreshes the coin data set balances and initiates the card refresh.
// ************************
ipcRenderer.on('async-get-recoverable-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance-reply event')

   if (arg.length > 1) {
      arg.every((recovBal) => {
         let coin = recovBal.pathName;
         let balance = recovBal.availableAmount;

         let cardDataObj = updateCoinDataSetRecoverableBalance(coin, balance);
         
         // Update the displayed card values
         refreshCardData(cardDataObj);

         return true;
      });
   }
   else {
      logger.error('Reply args incorrect');
   }
})

// ************************
// Purpose: This function receives the refresh wallets event from ipcMain and refresh the dashboard.
// ************************
ipcRenderer.on('async-refresh-wallets', (event, arg) => {
   logger.info('Received async-refresh-wallets event');

   refreshDashboard();
})

// ************************
// Purpose: This function receives the add wallet event from ipcMain and initiates the add wallet process.
// ************************
ipcRenderer.on('async-add-wallet', (event, arg) => {
   logger.info('Received async-add-wallet event');
   $('#add-wallet').show();
})

// ************************
// Purpose: This function receives the set launcher id event from ipcMain and initiates the set launcher id process.
// ************************
ipcRenderer.on('async-set-launcher', (event, arg) => {
   logger.info('Received async-set-launcher event');

   if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0) {
      $('#Launcher').val(clientConfigObj.launcherid);
   }

   $('#set-launcher').show();
})
// #endregion
