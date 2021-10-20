// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const Utils = require('./utils');
const coinImgPath = 'https://assets.alltheblocks.net/icons/forks_big/{0}.png';
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/view.log');
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
if (!fs.existsSync(walletFile))
   fs.writeFileSync(walletFile, '[]');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

// write empty file if wallets file is missing.
if (!fs.existsSync(clientConfigFile))
   fs.writeFileSync(clientConfigFile, '{}'); 
let clientConfigObj = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));

let coinPriceObj = JSON.parse(fs.readFileSync(coinPriceFile, 'utf8'));

let actualBalanceDisplayed = true;
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
// Purpose: 
//    Args: 
//  Return: N/A
// ************************
function handleKeyPress(event) {
   if (event.key == "Enter")
   {
      let walletVal = $('#Wallet').val();

      if (walletVal.length != 0)
      {
         addNewWallet();
      }
   }
}

// ***********************
// Name: 	autoRefreshHandler
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function autoRefreshHandler(){
   if ($('#autoRefreshCheck')[0].checked) 
   {
      refreshTimerId = setInterval(refreshDashboard, refreshTimerLength);
   }
   else
   {
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

$('#add-wallet').on('click', () => {
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
   if (!actualBalanceDisplayed)
   {
      actualBalanceDisplayed = true;
      $('#show-recoverable-balance').addClass('btn-secondary');
      $('#show-recoverable-balance').removeClass('btn-primary');
      $('#show-actual-balance').addClass('btn-primary');
      $('#show-actual-balance').removeClass('btn-secondary');
      getWalletBalances();
   }
})

$('#show-recoverable-balance').on('click', () => {
   if (actualBalanceDisplayed)
   {
      if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0)
      {
         actualBalanceDisplayed = false;
         $('#show-actual-balance').addClass('btn-secondary');
         $('#show-actual-balance').removeClass('btn-primary');
         $('#show-recoverable-balance').addClass('btn-primary');
         $('#show-recoverable-balance').removeClass('btn-secondary');
         getWalletRecoverableBalances();
      }
      else
      {
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
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function saveLauncherId()
{
   $('#set-launcher').hide();
   
   let launcherVal = $('#Launcher').val();

   clientConfigObj.launcherid = launcherVal;
   
   fs.writeFileSync(clientConfigFile, JSON.stringify(clientConfigObj, null, '\t'));

   // Render the Recoverable balances if they are being shown
   if (!actualBalanceDisplayed)
      getWalletRecoverableBalances();
}

// ***********************
// Name: 	addNewWallet
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function addNewWallet()
{
   $('#add-wallet').hide();
   
   let walletVal = $('#Wallet').val();
   let walletArr = walletVal.split(',');

   if (walletVal.length > 0)
   {
      walletArr.every((walletStr) => {
         walletStr = walletStr.trim();
         let coinCfg = getCoinConfigForWallet(walletStr);

         if (coinCfg != null)
         {
            if (!walletCache.has(walletStr))
            {
               walletObj.push({'wallet': walletStr});
               addEntry(walletStr, actualBalanceDisplayed);
               fs.writeFileSync(walletFile, JSON.stringify(walletObj, null, '\t'));
            }
            else
            {
               utils.showErrorMessage(logger, "The wallet (" + walletStr + ") already exists.", 5000);
            }
         }
         else
         {
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
function loadWalletDetails(coin)
{
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
function openNFTRecoverySite()
{
   // Copy the LauncherId from configuration to the Clipboard
   clipboard.writeText(clientConfigObj.launcherid);

   // Send the event to ipcMain to open the nft recovery page.
   logger.info('Sending open-nft-recovery-site event');
   ipcRenderer.send('open-nft-recovery-site', [clientConfigObj.launcherid]);
}

// ***********************
// Name: 	addEntry
// Purpose: 
//    Args: 
//  Return: N/A
// ************************
function addEntry(wallet, loadBalance) {
   let coinCfg = getCoinConfigForWallet(wallet);
   
   if (wallet) {
      let coinCfg = getCoinConfigForWallet(wallet);

      if (coinCfg != null)
      {
         walletCache.add(wallet);
         let coinCfg = getCoinConfigForWallet(wallet);
         buildWalletCard(wallet, coinCfg)
         if (loadBalance)
         {
            logger.info('Sending async-get-wallet-balance event');
            ipcRenderer.send('async-get-wallet-balance', [wallet, coinCfg.coinPathName]);
         }
      }
      else
      {
         logger.error("Unable to Add Entry for unsupported wallet (" + walletStr + ").");
      }
   }
}

// ***********************
// Name: 	refreshDashboard
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function refreshDashboard()
{
   getBlockchainSettingsConfiguration();

   if (actualBalanceDisplayed)
      getWalletBalances();
   else
      getWalletRecoverableBalances();
}

// ***********************
// Name: 	loadAndDisplayWallets
// Purpose: 
//    Args: 
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

   lastRefreshed = new Date();

   $('#lastRefreshDate small').show();
   $('#lastRefreshDate small').text('Refreshed On: ' + lastRefreshed.toLocaleString());
}


// #region Coin Dataset Operations

// ***********************
// Name: 	initializeCoinDataSet
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function initializeCoinDataSet()
{
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
// Purpose: 
//    Args: 
//  Return: 
// ************************
function updateCoinDataSetBalance(coin, balance, change)
{
   let coinDataObj = {};
   if (!isNaN(balance) && !isNaN(change))
   {
      coinData.every((c) => {
         if (c.coinPathName === coin)
         {
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
// Purpose: 
//    Args: 
//  Return: 
// ************************
function updateCoinDataSetRecoverableBalance(coin, balance)
{
   let coinDataObj = {};
   if (!isNaN(balance))
   {
      coinData.every((c) => {
         if (c.coinPathName === coin)
         {
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
// Purpose: 
//    Args:  N/A
//  Return:  N/A
// ************************
function getBlockchainSettingsConfiguration()
{
   ipcRenderer.send('async-get-blockchain-settings', []);
}

// ***********************
// Name: 	getCoinConfigForWallet
// Purpose: 
//    Args: 
//  Return:  N/A
// ************************
function getCoinConfigForWallet(wallet)
{
   let coinCfg;
   let coinCfgFound = false;
   coinConfigObj.every((cfg) => {
      if (wallet.startsWith(cfg.coinPrefix))
      {
         coinCfg = cfg;
         coinCfgFound = true;
         return false;
      }
      else
      {
         return true;
      }
   });

   if (coinCfgFound)
   {
      return coinCfg;
   }
   else
   {
      logger.error('Unable to locate coin configuration settings for ' + wallet);
   }
}

// ***********************
// Name: 	getCoinConfigForCoin
// Purpose: 
//    Args: 
//  Return: N/A
// ************************
function getCoinConfigForCoin(coin)
{
   let coinCfg;
   let coinCfgFound = false;
   coinConfigObj.every((cfg) => {
      if (coin == cfg.coinPathName)
      {
         coinCfg = cfg;
         coinCfgFound = true;
         return false;
      }
      else
      {
         return true;
      }
   });

   if (coinCfgFound)
   {
      return coinCfg;
   }
   else
   {
      logger.error('Unable to locate coin configuration settings for ' + wallet);
   }
}

// ***********************
// Name: 	getPriceForCoinPrefix
// Purpose: 
//    Args: 
//  Return: N/A
// ************************
function getPriceForCoinPrefix(coinPrefix)
{
   let price;
   coinPriceObj.every((cp) => {
      if (coinPrefix == cp.coinPrefix.toLowerCase())
      {
         price = cp.usd;
         return false;
      }
      else
      {
         return true;
      }
   });

   return price;
}
// #endregion

// #region Wallet Functions

// ***********************
// Name: 	buildWalletCard
// Purpose: 
//    Args: 
//  Return: N/A
// ************************
function buildWalletCard(wallet, coinCfg)
{
   let imgPath = coinImgPath.replace('{0}', coinCfg.coinPathName);
   
   let updateString = cardTemplate.replace('{0}', coinCfg.coinDisplayName).replace('{1}', coinCfg.coinPathName).replace('{2}', imgPath).replace('{3}', coinCfg.coinPathName).replace('{4}', coinCfg.coinPrefix).replace('{5}', coinCfg.coinPathName);

   if ($('#'+coinCfg.coinPathName+'-card').length == 0)
      $('#wallet-cards').append(updateString);
}

// ***********************
// Name: 	getWalletBalances
// Purpose: 
//    Args: N/A 
//  Return: N/A
// ************************
function getWalletBalances()
{
   $('#nft-recovery').hide();
   initializeCoinDataSet();

   walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

   $('.walletCard').remove();

   loadAndDisplayWallets(true);
}

// ***********************
// Name: 	getWalletRecoverableBalances
// Purpose: 
//    Args: N/A
//  Return: N/A
// ************************
function getWalletRecoverableBalances()
{
   $('#nft-recovery').hide();

   initializeCoinDataSet();

   if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0)
   {
      $('.walletCard').remove();

      loadAndDisplayWallets(false);

      // No Pending Balance to be displayed for Chia
      coinConfigObj.every((cfg) => {
         if (cfg.coinPathName == 'chia' || cfg.coinPathName == 'cryptodoge' || cfg.coinPathName == 'tad')
         {
            $('#'+cfg.coinPathName+'-card .spinner-border').remove();
            $('#'+cfg.coinPathName+'-card .card-text').text('N/A');
         }
         return true;
      });

      logger.info('Sending async-get-recoverable-wallet-balance event')
      ipcRenderer.send('async-get-recoverable-wallet-balance', [clientConfigObj.launcherid]);
   }
   else
   {
      utils.showErrorMessage(logger, "Unable to get recoverable balances.  Enter your chia launcherid into ./config/clientconfig.json", 1000);
   }
}
// #endregion

// #region Card Operations

// ***********************
// Name: 	refreshCardData
// Purpose: 
//    Args: 
//  Return: N/A
// ************************
function refreshCardData(cardDataObj)
{
   let coin = cardDataObj.coinPathName;
   let balance = (actualBalanceDisplayed) ? cardDataObj.coinBalance : cardDataObj.coinRecovBalance;
   let balanceUSD = (actualBalanceDisplayed) ? cardDataObj.coinBalanceUSD : cardDataObj.coinRecovBalanceUSD;
   let change = cardDataObj.coinChange;
   let walletCount = cardDataObj.coinWalletCount;

   if ($('#'+coin+'-card .card-text').length != 0)
   {
      //Remove loading spinner if present
      $('#'+coin+'-card .spinner-border').remove();
      $('#'+coin+'-card .card-balances').show();

      if (balance != null)
      {
         $('#'+coin+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance));
      }
      
      if (balanceUSD != null && balance > 0)
      {
         $('#'+coin+'-card .card-body .balance-usd').text(utils.getAdjustedUSDBalanceLabel(balanceUSD));
      }
      else
      {
         $('#'+coin+'-card .card-body .balance-usd').text('-');
      }

      if (actualBalanceDisplayed)
      {
         $('#'+coin+'-card #walletCount').text(Number(walletCount));
         $('#'+coin+'-card #walletCountLabel').text(" wallet" + ((walletCount > 1) ? "s" : ""));

         let pos_chg_icon = '<span style="color: green"><i class="fas fa-caret-up"></i></span>';
         let neg_chg_icon = '<span style="color: red"><i class="fas fa-caret-down"></i></span>';

         $('#'+coin+'-card .balanceChangeSymbol span').remove();
         if (change > 0)
         {
            $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
            $('#'+coin+'-card .balanceChangeSymbol').append(pos_chg_icon);
         }
         else if (change < 0)
         {
            $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
            $('#'+coin+'-card .balanceChangeSymbol').append(neg_chg_icon); 
         }
         else
         $('#'+coin+'-card .balanceChange').text(change.toLocaleString());
      }
      else
      {
         $('#nft-recovery').show();
      }
   }
}
//#endregion

// #region Async Event Handlers

// ************************
// Purpose: 
// ************************
ipcRenderer.on('async-get-blockchain-settings-reply', (event, arg) => {
   logger.info('Received async-get-blockchain-settings-reply event')
   
   if (arg.length > 1)
   {
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
   else
   {
      logger.error('Reply args incorrect');
   }
})
/*
"displayName": "Chia",
    "pathName": "chia",
    "coinPrefix": "xch",
    "programName": "chia",
    "mojoPerCoin": 1000000000000,
    "numberZeroBitsPlotFilter": 9,
    "difficultyConstantFactorExponent": 67,
    "approximateAmountOfBlocksPerDay": 4608,
    "donationAddress": "xch1k20j8nphw6unnfevkue0u2zleft0erzgewm0muzg65w30d63tgtsy9cet3",
    "hidden": false,
    "nftEnabled": true,
    "git": "https://github.com/Chia-Network/chia-blockchain",
    "xchforks": "https://xchforks.com/chia/",
    "chiaforkscalculator": null,
    "discord": "https://discord.gg/Mz4SG4KrYN",
    "website": "https://www.chia.net/"
*/

// ************************
// Purpose: 
// ************************
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-wallet-balance-reply event')
   if (arg.length == 4)
   {
      let coin = arg[0];
      let balance = arg[2];
      let balanceBefore = arg[3];
      let change = balance - balanceBefore;

      let cardDataObj = updateCoinDataSetBalance(coin, balance, change);

      refreshCardData(cardDataObj);    
   }
   else
   {
      logger.error('Reply args incorrect');
   }
})

// ************************
// Purpose: 
// ************************
ipcRenderer.on('async-get-recoverable-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance-reply event')
   if (arg.length > 1)
   {
      arg.every((recovBal) => {
         let coin = recovBal.pathName;
         let balance = recovBal.availableAmount;

         let cardDataObj = updateCoinDataSetRecoverableBalance(coin, balance);
         
         // Update the displayed card values
         refreshCardData(cardDataObj);

         return true;
      });
   }
   else
   {
      logger.error('Reply args incorrect');
   }
})

// ************************
// Purpose: 
// ************************
ipcRenderer.on('async-refresh-wallets', (event, arg) => {
   logger.info('Received async-refresh-wallets event');

   refreshDashboard();
})

// ************************
// Purpose: 
// ************************
ipcRenderer.on('async-add-wallet', (event, arg) => {
   logger.info('Received async-add-wallet event');
   $('#add-wallet').show();
})

// ************************
// Purpose: 
// ************************
ipcRenderer.on('async-set-launcher', (event, arg) => {
   logger.info('Received async-set-launcher event');

   if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0)
   {
      $('#Launcher').val(clientConfigObj.launcherid);
   }

   $('#set-launcher').show();
})
// #endregion

