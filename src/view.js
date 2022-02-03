// #region Const Definitions
   const {ipcRenderer, clipboard} = require('electron');
   const Utils = require('./utils');
   const coinImgPath = 'https://assets.alltheblocks.net/icons/forks_big/{0}.png';
   const logger = require('electron-log');
   logger.transports.file.resolvePath = () => path.join(__dirname, '../logs/view.log');

   const DisplayMode = {
      Actual: 'Actual',
      Recoverable: 'Recoverable'
   };
   const DisplayTheme = {
      Dark: 'Dark',
      Light: 'Light'
   };
   const SortField = {
      Name: 'name',
      USD: 'balance',
      Coins: 'coins',
      None: 'none'
   };
   const Currency = {
      USD: 'USD', // US Dollars
      GBP: 'GBP', // British Pound
      EUR: 'EUR', // Euro
      CNY: 'CNY', // China
      RUB: 'RUB', // Russia
      KRW: 'KRW', // South Korea
      JPY: 'JPY', // Japan
      AUD: 'AUD', // Australia
      CZK: 'CZK', // Czechia
      UAH: 'UAH', // Ukraine
      TWD: 'TWD', // Taiwan
      PLN: 'PLN', // Poland
      XPF: 'XPF', // New Caledonia
      KZT: 'KZT', // Kazakhstan
      INR: 'INR'  // India
   };
// #endregion

// #region Variable Definitions
   let $ = require('jquery');
   const fs = require('fs');
   const path = require('path');

   let configPath = path.resolve(__dirname, '../assets/config');
   let walletFile = `${configPath}/wallets.json`;
   let templateFile = path.resolve(__dirname, '../assets/templates/card-template-dashboard.html');
   let clientConfigFile = `${configPath}/clientconfig.json`;
   let cardTemplate = fs.readFileSync(templateFile, 'utf8');

   // Create config folder if missing
   if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath);
   }

   // write empty file if wallets file is missing.
   if (!fs.existsSync(walletFile)) {
      fs.writeFileSync(walletFile, '[]');
   }
   let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

   // write empty file if wallets file is missing.
   if (!fs.existsSync(clientConfigFile)) {
      fs.writeFileSync(clientConfigFile, '{"launcherId": "", "appSettings": { "displayTheme": "Light", "sortField": "None", "autoRefreshEnabled": false, "currency": "USD"}}'); 
   }
   let clientConfigObj = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));

   let displayMode = DisplayMode.Actual;
   let walletCache = new Set();
   let utils = new Utils();

   let coinPriceObj = [];
   let coinConfigObj = [];
   let exchangeRateObj = {};
   let coinData = [];   
   let lastRefreshed = new Date();
   let refreshTimerLength = 5*60*1000; // 5 minutes

   let refreshTimerId;
   let selectedLauncherId;

   let appVersion = "";
   let processPlatform = "";
   let processArch = "";

$(function () {
   logger.info('Sending async-check-latest-app-version event');
   ipcRenderer.send('async-check-latest-app-version', []);

   // transition USD config value to new balance value
   if (clientConfigObj.appSettings.sortField == 'usd')
   {
      clientConfigObj.appSettings.sortField = 'balance';
      storeAppSettings();
   }
      
   applyAppSettings();
   refreshDashboard();

   if (walletObj.length == 0)
   {
      $('#show-recoverable-balance').prop('disabled', true);
      $('#show-actual-balance').prop('disabled', true);
      $('#no-wallets-found').fadeIn(400, 'swing');
   }

});

// #region Page Event Handlers
// ***********************
// Name: 	autoRefreshHandler
// Purpose: This method handles handles chanages to the auto-refresh switch, activating/deactivating the timer object that refreshes the screen
//    Args: N/A
//  Return: N/A
// ************************
function autoRefreshHandler() {
   clientConfigObj.appSettings.autoRefreshEnabled = $('#autoRefreshCheck')[0].checked;

   if ($('#autoRefreshCheck')[0].checked) {
      refreshTimerId = setInterval(function() {refreshDashboard();}, refreshTimerLength);
   }
   else {
      clearInterval(refreshTimerId);
      // release our intervalID from the variable
      refreshTimerId = null; 
   }

   storeAppSettings();
}

$('#show-dark-mode').on('click', function () {
   clientConfigObj.appSettings.displayTheme = DisplayTheme.Dark;
   setDisplayTheme();
});

$('#show-light-mode').on('click', function () {
   clientConfigObj.appSettings.displayTheme = DisplayTheme.Light;
   setDisplayTheme();
});

$('#check-add-wallet').on('click', function () {
   addNewWallet($('#wallet-text-box').val());
   
   // Clear the value for the next entry
   $('#wallet-text-box').val(null);
});

$('#cancel-add-wallet').on('click', function () {
   $('#add-wallet').fadeOut(400, 'swing');

   // Clear the value for the next entry
   $('#wallet-text-box').val(null);
});

$('#paste-wallet-from-clipboard').on('click', function () {  
   pasteTextFromClipboard('#wallet-text-box');
});

$('#paste-launcher-from-clipboard').on('click', function () {  
   pasteTextFromClipboard('#launcher-text-box');
});

function pasteTextFromClipboard(elementId)
{
    let clipboardText = clipboard.readText();
   let currWalletVal = $(elementId).val();

   if (currWalletVal == null || currWalletVal == "") {
      $(elementId).val(clipboardText);
   }
   else if (currWalletVal.endsWith(',') || currWalletVal.endsWith(', ')) {
      $(elementId).val(`${currWalletVal}${clipboardText}`);
   }
   else {
      $(elementId).val(`${currWalletVal}, ${clipboardText}`);
   }
}

$('#add-launcher').on('click', function () {
   saveLauncherId();
});

$('#cancel-add-launcher').on('click', function () {
   $('#set-launcher').fadeOut(400, 'swing');
});

$('#show-actual-balance').on('click', function () {
   if (displayMode != DisplayMode.Actual) {
      displayMode = DisplayMode.Actual;
      $('#show-recoverable-balance').addClass('btn-secondary');
      $('#show-recoverable-balance').removeClass('btn-primary');
      $('#show-actual-balance').addClass('btn-primary');
      $('#show-actual-balance').removeClass('btn-secondary');
      $('#total-balance-type').text(displayMode);
      $('#launcher-dropdown').fadeOut(400, 'swing');
      getWalletBalances();
   }
});

$('#show-recoverable-balance').on('click', function () {
   if (displayMode != DisplayMode.Recoverable) {
      if (clientConfigObj != null && clientConfigObj.launcherId != null && clientConfigObj.launcherId.length > 0) {
         displayMode = DisplayMode.Recoverable;
         $('#show-actual-balance').addClass('btn-secondary');
         $('#show-actual-balance').removeClass('btn-primary');
         $('#show-recoverable-balance').addClass('btn-primary');
         $('#show-recoverable-balance').removeClass('btn-secondary');
         $('#total-balance-type').text(displayMode);
         $('#launcher-dropdown').fadeIn(400, 'swing');
         setupLauncherDropdown();
         getWalletRecoverableBalances();
      }
      else {
         $('#set-launcher').fadeIn(400, 'swing');
      }
   }
});

$('#open-nft-recovery').on('click', function () {
   //$('#nft-recovery').hide();
   openNFTRecoverySite();
});

$('#reload-button').on('click', function () {
   logger.info('Sending async-reload-application event');
   ipcRenderer.send('async-reload-application', []);
});

// #endregion

// #region Client Settings Mgmt
// ***********************
// Name: 	saveLauncherId
// Purpose: This function saves the launcher-id entered into the input box
//    Args: N/A
//  Return: N/A
// ************************
function saveLauncherId() {
   $('#set-launcher').fadeOut(400, 'swing');
   
   let launcherVal = $('#launcher-text-box').val();

   clientConfigObj.launcherId = launcherVal;
   
   storeAppSettings();
   setupLauncherDropdown();

   // Render the Recoverable balances if they are being shown
   if (displayMode === DisplayMode.Recoverable)
   {
      getWalletRecoverableBalances();
   }
}

// ***********************
// Name: 	storeAppSettings
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function storeAppSettings() {
   fs.writeFileSync(clientConfigFile, JSON.stringify(clientConfigObj, null, '\t'));
}

// ***********************
// Name: 	applyAppSettings
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function applyAppSettings() {
   if (clientConfigObj.appSettings == null) {
      clientConfigObj.appSettings = {};
   }

   setDisplayTheme();
   setSortOrder();
   setCurrency();

   if (clientConfigObj != null && clientConfigObj.appSettings != null && clientConfigObj.appSettings.autoRefreshEnabled != null) {
      $('#autoRefreshCheck').prop("checked", clientConfigObj.appSettings.autoRefreshEnabled);
      autoRefreshHandler();
   }

}

// ***********************
// Name: 	setDisplayTheme
// Purpose: This function sets the display theme.
//    Args: N/A
//  Return: N/A
// ************************
function setDisplayTheme() {
   if (clientConfigObj.appSettings.displayTheme === DisplayTheme.Dark) {
      $('#show-dark-mode').hide();
      $('#show-light-mode').show();
   }
   else {
      $('#show-light-mode').hide();
      $('#show-dark-mode').show();   
   }

   $('#theme-selector').show();

   if (clientConfigObj.appSettings.displayTheme === DisplayTheme.Dark) {
      $('body').addClass('dark-mode');
      $('div.card-body').addClass('dark-mode');
      $('div.card-header').addClass('dark-mode');
      $('div.card-footer').addClass('dark-mode');
      $('div.alert.alert-info').addClass('dark-mode');
      $('div.card').addClass('dark-mode');
      $('div.dropdown-content').addClass('dark-mode');
   }
   else {
      $('body').removeClass('dark-mode');
      $('div.card-body').removeClass('dark-mode');
      $('div.card-header').removeClass('dark-mode');
      $('div.card-footer').removeClass('dark-mode');
      $('div.alert.alert-info').removeClass('dark-mode');
      $('div.card').removeClass('dark-mode');
      $('div.dropdown-content').removeClass('dark-mode');
   }

   storeAppSettings();

   ipcRenderer.send('load-main-dashboard', [clientConfigObj.appSettings.displayTheme]);
}

// ***********************
// Name: 	setSortOrder
// Purpose: This function sets the sort order.
//    Args: N/A
//  Return: N/A
// ************************
function setSortOrder() {
  $('#sort-dropdown-text').text(`Sort: ${clientConfigObj.appSettings.sortField}  `);

   if (clientConfigObj.appSettings.sortField != SortField.None)
   {
      if (clientConfigObj.appSettings.sortField === SortField.Name) {
         coinData.sort(utils.applySort('coinDisplayName', 'asc'));   
      }
      else if (clientConfigObj.appSettings.sortField === SortField.Coins) {
         if (displayMode == DisplayMode.Actual) { 
            coinData.sort(utils.applySort('coinBalance', 'desc'));   
         }
         else { 
            coinData.sort(utils.applySort('coinRecovBalance', 'desc'));   
         }
      }
      else if (clientConfigObj.appSettings.sortField === SortField.USD) {
         if (displayMode == DisplayMode.Actual) { 
            coinData.sort(utils.applySort('coinBalanceUSD', 'desc'));   
         }
         else { 
            coinData.sort(utils.applySort('coinRecovBalanceUSD', 'desc'));   
         }
      }

      for (let i = 0; i < coinData.length; i++)
      {
         $('#' + coinData[i].coinPathName + '-card').css("order", i);
      }
   }
}

// ***********************
// Name: 	updateSortOrder
// Purpose: This function changes the sort order.
//    Args: N/A
//  Return: N/A
// ************************
function updateSortOrder(sort) {
   let sortFld = sort;

   if (sortFld != clientConfigObj.appSettings.sortField) {
      clientConfigObj.appSettings.sortField = sortFld;

      if (sortFld === 'none') {
         refreshWalletView();
      }
      else {
         setSortOrder();
      }
      
      storeAppSettings();  
   }
}

// ***********************
// Name: 	setCurrency
// Purpose: This function sets the currency.
//    Args: N/A
//  Return: N/A
// ************************
function setCurrency() {
   if (clientConfigObj.appSettings.currency == null)
   {
      clientConfigObj.appSettings.currency = "USD";
   }

   $('#currency-dropdown-text').text(`Curr: ${clientConfigObj.appSettings.currency.toLowerCase()}  `);

   refreshWalletView();
 }
 
 // ***********************
 // Name: 	updateCurrency
 // Purpose: This function changes the currency.
 //    Args: N/A
 //  Return: N/A
 // ************************
 function updateCurrency(currency) {
    let currencyFld = currency;
 
    if (currency != clientConfigObj.appSettings.currency || clientConfigObj.appSettings.currency == null) {
       clientConfigObj.appSettings.currency = currency;
 
       setCurrency();
       
       storeAppSettings();  
    }
 }

// ***********************
// Name: 	setupLauncherDropdown
// Purpose: This function sets up the launcher dropdown selector.
//    Args: N/A
//  Return: N/A
// ************************
function setupLauncherDropdown() {
   $('#launcher-dropdown .dropdown-content button').remove();
   if (clientConfigObj != null && clientConfigObj.launcherId != null && clientConfigObj.launcherId.length > 0) {
      let launcherids = clientConfigObj.launcherId.split(',');

      if (launcherids.length > 0) {
         if (launcherids.length > 1) {
            launcherids.every(function(launcherid) {
               $('#launcher-dropdown .dropdown-content').append(`<button  type="button" class="btn btn-small" onclick="launcherDropdownSelectionHandler('${launcherid.trim()}')"><small>${launcherid.trim()}</small></button>`);

               return true;
            });
         }

         selectedLauncherId = launcherids[0];
         launcherDropdownSelectionHandler(launcherids[0]);
      }
   }
}

// ***********************
// Name: 	launcherDropdownSelectionHandler
// Purpose: This function sets up the launcher dropdown selector.
//    Args: N/A
//  Return: N/A
// ************************
function launcherDropdownSelectionHandler(launcherid) {
   selectedLauncherId = launcherid;
   if (launcherid != null) {
      $('#launcher-dropdown-button small').text(`LauncherId: ${launcherid}`);
      
      $('.walletCard').remove();
   
      loadAndDisplayWallets(false);

      // remove hidden coins   
      coinConfigObj.every(function (cfg) {
         if (cfg.hidden) {
            $('#' + cfg.coinPathName + '-card').remove();
         }
         return true;
      });

      logger.info('Sending async-get-recoverable-wallet-balance event');
      ipcRenderer.send('async-get-recoverable-wallet-balance', [launcherid]);
   }
}

// #endregion

// ***********************
// Name: 	addNewWallet
// Purpose: This function adds a new wallet into the dashboard, saves the updated configuration and initiates the other processes to get the balance information.
//    Args: N/A
//  Return: N/A
// ************************
function addNewWallet(walletVal) {
   $('#show-recoverable-balance').prop('disabled', false);
   $('#show-actual-balance').prop('disabled', false);
   $('#add-wallet').fadeOut(400, 'swing');
   
   let walletArr = walletVal.split(',');

   if (walletVal.length > 0) {
      walletArr.every(function (walletStr) {
         walletStr = walletStr.trim();
         let coinCfg = getCoinConfigForWallet(walletStr);

         if (coinCfg != null) {
            if (!walletCache.has(walletStr)) {
               walletObj.push({ 'wallet': walletStr });
               addEntry(walletStr, (displayMode === DisplayMode.Actual));
               fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));
            }
            else {
               utils.showWarnMessage(logger, `The wallet (${walletStr}) already exists.`, 5000);
            }
         }
         else {
            utils.showWarnMessage(logger, `The wallet is currently unsupported.  You entered (${walletStr}).`, 5000);
         }

         return true;
      });
   }

   setDisplayTheme();
   setSortOrder();
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
   ipcRenderer.send('open-wallet-details', [coinCfg, clientConfigObj, exchangeRateObj]);
}

// ***********************
// Name: 	openNFTRecoverySite
// Purpose: This function copies the LauncherId into the Clipboard and then sends an event to ipcMain to display the NFT Recovery page.
//    Args: N/A
//  Return: N/A
// ************************
function openNFTRecoverySite() {
   // Copy the LauncherId from configuration to the Clipboard
   clipboard.writeText(selectedLauncherId);

   // Send the event to ipcMain to open the nft recovery page.
   logger.info('Sending open-nft-recovery-site event');
   ipcRenderer.send('open-nft-recovery-site', [selectedLauncherId]);
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
         buildWalletCard(coinCfg);

         if (loadBalance) {
            logger.info('Sending async-get-wallet-balance event');
            ipcRenderer.send('async-get-wallet-balance', [wallet, coinCfg.coinPathName]);
         }
      }
      else {
         logger.error(`Unable to Add Entry for unsupported wallet (${wallet}).`);
      }
   }
}

// ***********************
// Name: 	refreshDashboard
// Purpose: The main function for refreshing the full dashboard.
//    Args: N/A
//  Return: N/A
// ************************
function refreshDashboard() {
   $('#overallBalance').text(utils.getAdjustedCurrencyBalanceLabel(0, clientConfigObj.appSettings.currency, exchangeRateObj));

   ipcRenderer.send('async-get-fork-prices', [clientConfigObj.launcherId.split(',')[0]]);
}

// ***********************
// Name: 	refreshWalletView
// Purpose: The main function for wallet views on the dashboard.
//    Args: N/A
//  Return: N/A
// ************************
function refreshWalletView() {
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
   $('#overallBalance').text(utils.getAdjustedCurrencyBalanceLabel(0, clientConfigObj.appSettings.currency, exchangeRateObj));
   //clear the wallet cache
   walletCache.clear();

   //Check if file exists
   if(fs.existsSync(walletFile)) {
      walletObj.every(function (w) {
         addEntry(w.wallet, loadBalance);

         return true;
      });
   }

   // Show the last time the dashboad was refreshed.
   if (walletCache.size > 0) {
      lastRefreshed = new Date();

      $('#refreshDiv').show();
      $('#lastRefreshDate small').text(`Refreshed On: ${lastRefreshed.toLocaleString()}`);
   }

   setDisplayTheme();
   setSortOrder();
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

   coinConfigObj.every(function (cfg) {
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
         coinWalletCount: 0,
         hidden: cfg.hidden
      });

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
      coinData.every(function (c) {
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
      coinData.every(function (c) {
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

// ***********************
// Name: 	updateCoinTotalBalance
// Purpose: This function updates the total balance UI across all wallets.
//  Return: .
// ************************
function updateCoinTotalBalance() {
   var totalBalance = 0;
   coinData.every(function (c) {
      if (displayMode == DisplayMode.Actual) {
         if (c.coinBalanceUSD != null) {
            totalBalance += c.coinBalanceUSD;
         }
      }
      else if (displayMode == DisplayMode.Recoverable) {
         if (c.coinRecovBalanceUSD != null) {
            totalBalance += c.coinRecovBalanceUSD;
         }
      }

      return true;
   });

   $('#overallBalance').text(utils.getAdjustedCurrencyBalanceLabel(totalBalance, clientConfigObj.appSettings.currency, exchangeRateObj));
}
// #endregion

// #region Configuration

// ***********************
// Name: 	getCoinConfigForWallet
// Purpose: Retrieves the coin configuration object for a given wallet.
//    Args: wallet - the wallet address
//  Return:  N/A
// ************************
function getCoinConfigForWallet(wallet) {
   let coinCfg;
   let coinCfgFound = false;
   coinConfigObj.every(function (cfg) {
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
      logger.error(`Unable to locate coin configuration settings for ${wallet}`);
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
   coinConfigObj.every(function (cfg) {
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
      logger.error(`Unable to locate coin configuration settings for ${wallet}`);
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
   coinPriceObj.every(function (cp) {
      if (coinPrefix == cp.symbol.toLowerCase()) {
         price = cp.price;
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
function buildWalletCard(coinCfg, replaceExistingCard = false) {
   let imgPath = coinImgPath.replace('{0}', coinCfg.coinPathName);
   
   let updateString = cardTemplate.replace('{0}', coinCfg.coinDisplayName).replace('{1}', coinCfg.coinPathName).replace('{2}', imgPath).replace('{3}', coinCfg.coinPathName).replace('{4}', coinCfg.coinPrefix).replace('{5}', coinCfg.coinPathName);

   if (!replaceExistingCard && $('#'+coinCfg.coinPathName+'-card').length == 0) {
      $('#wallet-cards').append(updateString);
   }
   else if (replaceExistingCard && $('#'+coinCfg.coinPathName+'-card').length > 0) {
      $('#'+coinCfg.coinPathName+'-card').replaceWith(updateString);
   }
}

// ***********************
// Name: 	getWalletBalances
// Purpose: This function is used to refresh all of the cards on the actual wallet balance page.
//    Args: N/A 
//  Return: N/A
// ************************
function getWalletBalances() {
   $('#overallBalance').text(utils.getAdjustedCurrencyBalanceLabel(0, clientConfigObj.appSettings.currency, exchangeRateObj));

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
   $('#nft-recovery').fadeIn(400, 'swing');

   initializeCoinDataSet();

   launcherDropdownSelectionHandler(selectedLauncherId);
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

   logger.info(`Coin: ${coin}, Balance: ${balance}, Balance USD: ${balanceUSD}, Change: ${change}, Wallet Count: ${walletCount}`);

   const pos_chg_icon = '<span style="color: green"><i class="fas fa-caret-up"></i></span>';
   const neg_chg_icon = '<span style="color: red"><i class="fas fa-caret-down"></i></span>';

   if ($('#'+coin+'-card .card-text').length != 0) {
      // Remove loading spinner if present
      $('#'+coin+'-card .spinner-border').remove();
      $('#'+coin+'-card .card-balances').fadeIn(400, 'swing');;

      if (cardDataObj.coinPrice != null) {
         $('#'+coin+'-card .coin-price').text((utils.getAdjustedCurrencyBalanceLabel(Number(cardDataObj.coinPrice), clientConfigObj.appSettings.currency, exchangeRateObj)) + ' each');
      }

      // Update the balance
      if (balance != null) {
         $('#'+coin+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance));
         $('#'+coin+'-card .card-body .balance').prop('title', balance);
      }
      
      // Update the balance in USD, set to '-' if price information isn't available
      
      $('#'+coin+'-card #balance-currency-label').text(clientConfigObj.appSettings.currency.toLowerCase());

      if (balanceUSD != null && balance > 0) {
         $('#'+coin+'-card .card-body .balance-currency').text(utils.getAdjustedCurrencyBalanceLabel(balanceUSD, clientConfigObj.appSettings.currency, exchangeRateObj).replace(clientConfigObj.appSettings.currency, '').trim());
      }
      else {
         $('#'+coin+'-card .card-body .balance-currency').text('-');
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
         else {
            $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
         }
         
         setSortOrder();
      }
      else if (displayMode === DisplayMode.Recoverable) {
         setSortOrder();
      }

      updateCoinTotalBalance();
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
      coinConfigObj = [];

      // Push data from args into the coinConfigObj
      arg.every(function (blockSettings) {
         coinConfigObj.push({
            coinPrefix: blockSettings.coinPrefix,
            coinPathName: blockSettings.pathName,
            coinDisplayName: blockSettings.displayName,
            mojoPerCoin: blockSettings.mojoPerCoin,
            coinPrice: getPriceForCoinPrefix(blockSettings.coinPrefix),
            hidden: blockSettings.hidden
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
});

// ************************
// Purpose: This function receives the fork prices reply from ipcMain and loads the dashboard
// ************************
ipcRenderer.on('async-get-fork-prices-reply', (event, arg) => {
   logger.info('Received async-get-fork-prices-reply event')
   
   if (arg.length > 0) {
      coinPriceObj = [];

      // Push data from args into the coinConfigObj
      arg.every(function (coinPrice){
         coinPriceObj.push({
            name: coinPrice.name,
            symbol: coinPrice.symbol,
            price: coinPrice.price
         });

         return true;
      });

      // if coin config blank, retrieve the settings.  Else, update the prices in the current coin config object.
      if (coinConfigObj.length == 0) {
         ipcRenderer.send('async-get-blockchain-settings', [clientConfigObj.launcherId.split(',')[0]]);   
      }
      else {
         let updatedCoinConfigObj = [];

         // Push data from args into the coinConfigObj
         coinConfigObj.every(function (coinCfgSetting) {
            updatedCoinConfigObj.push({
               coinPrefix: coinCfgSetting.coinPrefix,
               coinPathName: coinCfgSetting.coinPathName,
               coinDisplayName: coinCfgSetting.coinDisplayName,
               mojoPerCoin: coinCfgSetting.mojoPerCoin,
               coinPrice: getPriceForCoinPrefix(coinCfgSetting.coinPrefix),
               hidden: coinCfgSetting.hidden
            });

            return true;
         });

         coinConfigObj = updatedCoinConfigObj;

         if (displayMode === DisplayMode.Actual) {
            getWalletBalances();
         }
         else {
            getWalletRecoverableBalances();
         }
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the exchange rates reply from ipcMain
// ************************
ipcRenderer.on('async-get-exchange-rates-reply', (event, arg) => {
   debugger;
   logger.info('Received async-get-exchange-rates-reply event')

   exchangeRateObj = arg.data;
});

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

      logger.info(`Coin: ${coin}, Balance: ${balance}, Change: ${change}`);

      let cardDataObj = updateCoinDataSetBalance(coin, balance, change);

      refreshCardData(cardDataObj);    
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the recoverable wallet balance reply from ipcMain, refreshes the coin data set balances and initiates the card refresh.
// ************************
ipcRenderer.on('async-get-recoverable-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance-reply event')

   if (arg.length > 1) {
      arg.every(function (recovBal) {
         let coin = recovBal.pathName;
         let balance = recovBal.availableAmount;

         // if data api returns balance of -1, its non-recoverable and shouldn't be shown
         if (balance == -1) {
            $(`#${coin}-card`).remove();
         }
         else {
            let cardDataObj = updateCoinDataSetRecoverableBalance(coin, balance);

            // Update the displayed card values
            refreshCardData(cardDataObj);   
         }

         return true;
      });
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the version information reply from ipcMain, checks latest version against current version.
// ************************
ipcRenderer.on('async-check-latest-app-version-reply', (event, arg) => {
   logger.info('Received async-check-latest-app-version-reply event')

   if (arg.length == 1) {
      let replyData = arg[0];
      let message = `You are currently running ForkBoard v${replyData.currentVersion}.  An updated version (<i><b>v${replyData.latestVersion}</b></i>) was released on ${new Date(replyData.publishedDate).toLocaleString('en-US')}.  Click to the right to download the latest versions.`;
      let instructions = replyData.releaseNotes;

      $('#infoVersionMessage').html(message);
      $('#infoVersionNotes').html(`<br><u><b>ForkBoard v${replyData.latestVersion} Release Notes</b></u><br>${instructions}`);

      //$('#version-download-buttons').append(`<small class="text-muted">Downloads</small>`);
      $('#version-download-buttons').append(`<div><a href="${replyData.downloadURL_Windows}" class="btn btn-primary"><small>Windows</small></a></div>`);
      $('#version-download-buttons').append(`<div><a href="${replyData.downloadURL_MacOS}" class="btn btn-primary"><small>MacOS</small></a></div>`);
      $('#version-download-buttons').append(`<div><a href="${replyData.downloadURL_Ubuntu}" class="btn btn-primary"><small>Ubuntu</small></a></div>`);

      $('#infoVersionBox').fadeIn(400, 'swing');
      
      setTimeout(
         function () {
            $('#infoVersionBox').fadeOut(400, 'swing');
         }, 10000
      );
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the recoverable wallet balance error from ipcMain.
// ************************
ipcRenderer.on('async-get-recoverable-wallet-balance-error', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance-error event')

   if (arg.length == 2) {
      let errMsg = arg[0];
      let launcherId = arg[1];
      let message = `There was an error getting recoverable balances for LauncherId: ${launcherId}.  The reported error is "${errMsg}".`;
      let instructions = 'Please restart the application or click Reload on the View menu.  Reach out to us on Discord or log an issue in Github if the issue continue.';
      utils.showErrorMessage(logger, message, instructions);
   }
   else {
      logger.error('Reply args incorrect');
   }
});


// ************************
// Purpose: This function receives the wallet balance error from ipcMain.
// ************************
ipcRenderer.on('async-get-wallet-balance-error', (event, arg) => {
   logger.info('Received async-get-wallet-balance-error event')
   
   if (arg.length == 3) { 
      let errMsg = arg[0];
      let coin = arg[1];
      let wallet = arg[2];
      let message = `There was an error getting wallet balances for ${coin} (${wallet}).  The reported error is "${errMsg}".`;
      let instructions = 'Please restart the application.  Reach out to us on Discord or log an issue in Github if the issue continue.';
      utils.showErrorMessage(logger, message, instructions);
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the blockchain settings error from ipcMain.
// ************************
ipcRenderer.on('async-get-blockchain-settings-error', (event, arg) => {
   logger.info('Received async-get-blockchain-settings-error event')
   
   if (arg.length = 1) {
      let errMsg = arg[0];
      let message = `There was an error getting the blockchain settings from AllTheBlocks.  The reported error is "${errMsg}".`;
      let instructions = 'Please restart the application.  Reach out to us on Discord or log an issue in Github if the issue continue.';
      utils.showErrorMessage(logger, message, instructions);
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the fork prices error from ipcMain.
// ************************
ipcRenderer.on('async-get-fork-prices-error', (event, arg) => {
   logger.info('Received async-get-fork-prices-error event')
   
   if (arg.length == 1) {
      let errMsg = arg[0];
      let message = `There was an error getting fork prices from XCHUniverse.  The reported error is "${errMsg}".`;
      let instructions = 'Please restart the application.  Reach out to us on Discord or log an issue in Github if the issue continue.';
      utils.showErrorMessage(logger, message, instructions);
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the exchange rates error from ipcMain.
// ************************
ipcRenderer.on('async-get-exchange-rates-error', (event, arg) => {
   logger.info('Received async-get-exchange-rates-error event')
   
   if (arg.length == 1) {
      let errMsg = arg[0];
      let message = `There was an error getting exchange rates from the ForkBoard API.  The reported error is "${errMsg}".`;
      let instructions = 'Please restart the application.  Reach out to us on Discord or log an issue in Github if the issue continue.  This message will auto-hide in 5 seconds.';
      utils.showErrorMessage(logger, message, instructions, 5000);
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the exchange rates error from ipcMain.
// ************************
ipcRenderer.on('async-check-latest-app-version-error', (event, arg) => {
   logger.info('Received async-check-latest-app-version-error event')
   
   if (arg.length == 1) {
      let errMsg = arg[0];
      let message = `There was an error getting version information from Github.  The reported error is "${errMsg}".`;
      let instructions = 'Please restart the application.  Reach out to us on Discord or log an issue in Github if the issue continue.';
      utils.showErrorMessage(logger, message, instructions);
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the refresh wallets event from ipcMain and refresh the dashboard.
// ************************
ipcRenderer.on('async-refresh-wallets', (event, arg) => {
   logger.info('Received async-refresh-wallets event');

   refreshDashboard();
});

// ************************
// Purpose: This function receives the add wallet event from ipcMain and initiates the add wallet process.
// ************************
ipcRenderer.on('async-add-wallet', (event, arg) => {
   logger.info('Received async-add-wallet event');
   // Show the add wallet panel
   $('#add-wallet').fadeIn(400, 'swing');
   // Set focus on the text box
   $('#wallet-text-box').focus();
   // Hide No wallets panel
   $('#no-wallets-found').hide();
   // Hide Set Launcher
   $('#set-launcher').hide();
});

// ************************
// Purpose: This function receives the set launcher id event from ipcMain and initiates the set launcher id process.
// ************************
ipcRenderer.on('async-set-launcher', (event, arg) => {
   logger.info('Received async-set-launcher event');

   if (clientConfigObj != null && clientConfigObj.launcherId != null && clientConfigObj.launcherId.length > 0) {
      $('#launcher-text-box').val(clientConfigObj.launcherId);
   }
   // Show the launcher panel
   $('#set-launcher').fadeIn(400, 'swing');
 
   // Set focus on the text box
   $('#launcher-text-box').focus();

   // Hide the add wallet panel
   $('#add-wallet').hide();
});

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet detail page renders
// ************************
ipcRenderer.on('async-refresh-card-display', (event, arg) => {
   logger.info('Received async-refresh-card-display event');
   
   if (arg.length == 1) {
      coinCfg = arg[0];

      logger.info(`Loading details for ${coinCfg.coinDisplayName}`);

      // Reload the config data from wallet objects
      walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

      // Replace the existing card with a new one, ready to load.
      buildWalletCard(coinCfg, true);

      coinData = coinData.filter(function(obj, index, arr) { 
         return obj.coinPathName != coinCfg.coinPathName;
      });

      coinData.push({
         coinPrefix: coinCfg.coinPrefix,
         coinPathName: coinCfg.coinPathName,
         coinDisplayName: coinCfg.coinDisplayName,
         coinHidden: coinCfg.hidden,
         mojoPerCoin: coinCfg.mojoPerCoin,
         coinPrice: coinCfg.coinPrice,
         coinBalance: 0,
         coinBalanceUSD: 0,
         coinChange: 0,
         coinRecovBalance: 0,
         coinRecovBalanceUSD: 0,
         coinWalletCount: 0
      });

      // Reset the wallet cache
      walletCache.clear();

      let walletPresent = false;
      walletObj.every((w) => {
         walletCache.add(w.wallet);

         if (w.wallet.startsWith(coinCfg.coinPrefix)) {
            addEntry(w.wallet, true);
            walletPresent = true;
         }

         return true;
      });

      if (!walletPresent) {
         $('#'+coinCfg.coinPathName+'-card').remove();
      }

      setDisplayTheme();
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the the wallet backup is initiated
// ************************
ipcRenderer.on('async-backup-wallet-config-action', (event, arg) => {
   logger.info('Received async-backup-wallet-config-action');
  
      if (arg.length == 1) {

         let currDate = new Date();
         let currTimestamp = `${currDate.getFullYear()}${(currDate.getMonth()+1 < 10 ? '0' : '')}${currDate.getMonth()+1}${(currDate.getDate()+1 < 10 ? '0' : '')}${currDate.getDate()}${(currDate.getHours()+1 < 10 ? '0' : '')}${currDate.getHours()}${(currDate.getMinutes()+1 < 10 ? '0' : '')}${currDate.getMinutes()}${(currDate.getSeconds()+1 < 10 ? '0' : '')}${currDate.getSeconds()}`;

         // Set the filename
         let backupDest = arg[0];
         let backupFilename = path.join(backupDest, `forkboard-backup-${currTimestamp}.json`);
         
         let backFileStr = `{
            "name": "ForkBoard Backup File",
            "version": "${appVersion}",
            "date": "${new Date().toLocaleString('en-US')}",
            "walletConfiguration": ${JSON.stringify(walletObj, null, '\t')},
            "clientConfiguration": ${JSON.stringify(clientConfigObj, null, '\t')}
         }`;
         
         fs.writeFileSync(backupFilename, backFileStr);

         utils.showInfoMessage(logger, `Successfully created backup file - ${backupFilename}`, 4000);
      }
});

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the the wallet restore is initiated
// ************************
ipcRenderer.on('async-restore-wallet-config-action', (event, arg) => {
   logger.info('Received async-restore-wallet-config-action');
 
   if (arg.length == 1) {
      let restoreFilename = arg[0];

      if (fs.existsSync(restoreFilename)) {

         let restoreObj = JSON.parse(fs.readFileSync(restoreFilename, 'utf8'));

         //validate file
         if (restoreObj.name == null || restoreObj.version == null || restoreObj.date == null || restoreObj.walletConfiguration == null || restoreObj.clientConfiguration == null) {
            utils.showInfoMessage(logger, `Invalid file format detected attempting to restore the backup file from ${restoreFilename}`, 4000);
         }
         else {
            // clear the wallet object
            walletObj = [];
            clientConfigObj = {};
            
            // read data from backup file
            walletObj = restoreObj.walletConfiguration;
            clientConfigObj = restoreObj.clientConfiguration;

            // write new wallets.json file in config folder.
            fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));

            // write new wallets.json file in config folder.
            fs.writeFileSync(clientConfigFile, JSON.stringify(clientConfigObj, null, '\t'));

            utils.showInfoMessage(logger, `Successfully restored a version ${restoreObj.version} backup file from ${restoreObj.date} - ${restoreFilename}`, 4000);

            if (walletObj.length != 0)
            {
               $('#show-recoverable-balance').prop('disabled', false);
               $('#show-actual-balance').prop('disabled', false);
               $('#no-wallets-found').hide();
            }
            
            applyAppSettings();
            refreshDashboard();
         }
      }
   }
});

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet tool import is initiated
// ************************
ipcRenderer.on('async-import-wallet-tool-export-action', (event, arg) => {
   logger.info('Received async-import-wallet-tool-export-action');
 
   if (arg.length == 1) {
      let importFilename = arg[0];

      if (fs.existsSync(importFilename)) {     

         let importObj = JSON.parse(fs.readFileSync(importFilename, 'utf8'));

         //validate file
         if (importObj.name == null || importObj.forks == null || importObj.date == null || importObj.walletConfiguration == null) {
            utils.showInfoMessage(logger, `Invalid file format detected attempting to import the wallet tool file from ${importFilename}`, 4000);
         }
         else {

            importObj.walletConfiguration.every(function (walletCfgObj) {
               addNewWallet(walletCfgObj.wallet);
               return true;
            });

            utils.showInfoMessage(logger, `Successfully imported a ForkBoard Wallet Tool Export file for ${importObj.forks} from ${importObj.date} - ${restoreFilename}`, 4000);
         }
      }
   }
});

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the the wallet restore is initiated
// ************************
ipcRenderer.on('load-main-dashboard-reply', (event, arg) => {
   logger.info('Received load-main-dashboard-reply');

   if (arg.length == 3) {
      appVersion = arg[0];
      processPlatform = arg[1];
      processArch = arg[2];
   }
   else {
      logger.error('Event args incorrect');
   }

});


// #endregion
