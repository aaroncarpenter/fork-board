let $ = require('jquery');
let fs = require('fs');
let path = require('path');
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/view.log');

const {ipcRenderer, clipboard} = require('electron');
const Utils = require('./utils');

let walletFile = path.resolve(__dirname, '../resources/config/wallets.json');
let templateFile = path.resolve(__dirname, '../resources/templates/card-template-dashboard.html');
let coinConfigFile = path.resolve(__dirname, '../resources/config/coinconfig.json');
let clientConfigFile = path.resolve(__dirname, '../resources/config/clientconfig.json');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
//let coinConfigObj = JSON.parse(fs.readFileSync(coinConfigFile, 'utf8'));

// write empty file if wallets file is missing.
if (!fs.existsSync(walletFile))
   fs.writeFileSync(walletFile, '[]');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

// write empty file if wallets file is missing.
if (!fs.existsSync(clientConfigFile))
   fs.writeFileSync(clientConfigFile, '{}');
let clientConfigObj = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));

const coinImgPath = 'https://assets.alltheblocks.net/icons/forks_big/{0}.png';

let actualBalanceDisplayed = true;
let walletCache = new Set();
let utils = new Utils();

let coinConfigObj = [];
let coinData = [];

getBlockchainSettingsConfiguration();

// #region Page Event Handlers

addEventListener('keyup', handleKeyPress, true);

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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
      $('#show-recoverable-balance').addClass('btn-secondary');
      $('#show-recoverable-balance').removeClass('btn-primary');
      $('#show-actual-balance').addClass('btn-primary');
      $('#show-actual-balance').removeClass('btn-secondary');
      getWalletBalances();
      actualBalanceDisplayed = true;
   }
})

$('#show-recoverable-balance').on('click', () => {
   if (actualBalanceDisplayed)
   {
      if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0)
      {
         $('#show-actual-balance').addClass('btn-secondary');
         $('#show-actual-balance').removeClass('btn-primary');
         $('#show-recoverable-balance').addClass('btn-primary');
         $('#show-recoverable-balance').removeClass('btn-secondary');
         getWalletRecoverableBalances();
         actualBalanceDisplayed = false;
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
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function addNewWallet()
{
   $('#add-wallet').hide();
   
   let walletVal = $('#Wallet').val();
   let walletArr = walletVal.split(',');

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

   $('#Wallet').val(null);
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function loadWalletDetails(coin)
{
   let coinCfg = getCoinConfigForCoin(coin);
   
   logger.info('Sending open-wallet-details event');
   ipcRenderer.send('open-wallet-details', [coinCfg]);
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function openNFTRecoverySite()
{
   clipboard.writeText(clientConfigObj.launcherid);

   logger.info('Sending open-nft-recovery-site event');
   ipcRenderer.send('open-nft-recovery-site', [clientConfigObj.launcherid]);
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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
}


// #region Coin Dataset Operations

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function initializeCoinDataSet()
{
   coinData = [];

   coinConfigObj.every((cfg) => {
      coinData.push({
         coinPrefix: cfg.coinPrefix,
         coinPathName: cfg.coinPathName,
         coinDisplayName: cfg.coinDisplayName,
         mojoPerCoin: cfg.mojoPerCoin,
         coinBalance: 0,
         coinChange: 0,
         coinRecovBalance: 0,
         coinWalletCount: 0
      })

      return true;
   });
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function updateCoinDataSetRecoverableBalance(coin, balance)
{
   let coinDataObj = {};
   if (!isNaN(balance))
   {
      coinData.every((c) => {
         if (c.coinPathName === coin)
         {
            c.coinRecovBalance = (balance / c.mojoPerCoin);

            coinDataObj = c;

            return false;
         }

         return true;
      });
   }

   return coinDataObj;
}
// #endregion

// #region Condfiguration

function getBlockchainSettingsConfiguration()
{
   //TODO Show Initializing Message

   ipcRenderer.send('async-get-blockchain-settings', []);
}

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

// #endregion

// #region Wallet Functions

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function buildWalletCard(wallet, coinCfg)
{
   let imgPath = coinImgPath.replace('{0}', coinCfg.coinPathName);
   
   let updateString = cardTemplate.replace('{0}', coinCfg.coinDisplayName).replace('{1}', coinCfg.coinPathName).replace('{2}', imgPath).replace('{3}', coinCfg.coinPathName).replace('{4}', coinCfg.coinPrefix).replace('{5}', coinCfg.coinPathName);

   if ($('#'+coinCfg.coinPathName+'-card').length == 0)
      $('#wallet-cards').append(updateString);
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function getWalletBalances()
{
   $('#nft-recovery').hide();
   initializeCoinDataSet();

   walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

   $('.walletCard').remove();

   loadAndDisplayWallets(true);
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function refreshCardData(cardDataObj)
{
   let coin = cardDataObj.coinPathName;
   let balance = cardDataObj.coinBalance;
   let change = cardDataObj.coinChange;
   let walletCount = cardDataObj.coinWalletCount;

   if ($('#'+coin+'-card .card-text').length != 0)
   {
      //Remove loading spinner if present
      $('#'+coin+'-card .spinner-border').remove();
      $('#'+coin+'-card #walletCount').text(Number(walletCount));
      $('#'+coin+'-card #walletCountLabel').text(" wallet" + ((walletCount > 1) ? "s" : ""));
      $('#'+coin+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance));

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
}

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
function refreshRecoverableCardData(cardDataObj)
{
   let coin = cardDataObj.coinPathName;
   let balance = cardDataObj.coinRecovBalance;
   let mojoPerCoin = cardDataObj.mojoPerCoin;

   if ($('#'+coin+'-card .card-text').length != 0)
   {
      //Remove loading spinner if present
      $('#'+coin+'-card .spinner-border').remove();

      if ($('#'+coin+'-card .card-text').text() != 'N/A')
      {
         $('#'+coin+'-card .card-text').text(utils.getAdjustedBalanceLabel(balance/mojoPerCoin));
      }

      $('#nft-recovery').show();
   }
}
//#endregion

// #region Async Event Handlers

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
ipcRenderer.on('async-get-blockchain-settings-reply', (event, arg) => {
   logger.info('Received async-get-blockchain-settings-reply event')
   if (arg.length > 1)
   {
      arg.every((blockSettings) => {
         coinConfigObj.push({
            coinPrefix: blockSettings.coinPrefix,
            coinPathName: blockSettings.pathName,
            coinDisplayName: blockSettings.displayName,
            mojoPerCoin: blockSettings.mojoPerCoin
         });

         return true;
      });

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
// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
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

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
ipcRenderer.on('async-get-recoverable-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance-reply event')
   if (arg.length > 1)
   {
      arg.every((recovBal) => {
         let coin = recovBal.pathName;
         let balance = recovBal.availableAmount;

         let cardDataObj = updateCoinDataSetRecoverableBalance(coin, balance);
         
         // Update the displayed card values
         refreshRecoverableCardData(cardDataObj);

         return true;
      });
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
ipcRenderer.on('async-refresh-wallets', (event, arg) => {
   logger.info('Received async-refresh-wallets event');

   getBlockchainSettingsConfiguration();


   if (actualBalanceDisplayed)
      getWalletBalances();
   else
      getWalletRecoverableBalances();
})

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
ipcRenderer.on('async-add-wallet', (event, arg) => {
   logger.info('Received async-add-wallet event');
   $('#add-wallet').show();
})

// ***********************
// Name: 	
// Purpose: 
//    Args: 
//  Return: 
// *************************
ipcRenderer.on('async-set-launcher', (event, arg) => {
   logger.info('Received async-set-launcher event');

   if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0)
   {
      $('#Launcher').val(clientConfigObj.launcherid);
   }

   $('#set-launcher').show();
})
// #endregion

