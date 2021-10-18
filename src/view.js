let $ = require('jquery');
let fs = require('fs');
let path = require('path');
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/view.log');

const {ipcRenderer, clipboard} = require('electron');

let walletFile = path.resolve(__dirname, '../resources/config/wallets.json');
let templateFile = path.resolve(__dirname, '../resources/templates/card-template-dashboard.html');
let coinConfigFile = path.resolve(__dirname, '../resources/config/coinconfig.json');
let clientConfigFile = path.resolve(__dirname, '../resources/config/clientconfig.json');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
let coinConfigObj = JSON.parse(fs.readFileSync(coinConfigFile, 'utf8'));
let clientConfigObj = JSON.parse(fs.readFileSync(clientConfigFile, 'utf8'));

// write empty file if wallets file is missing.
if (!fs.existsSync(walletFile))
   fs.writeFileSync(walletFile, '[]');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

let coinImgPath = 'https://assets.alltheblocks.net/icons/forks_big/{0}.png';

let actualBalanceDisplayed = true;
let walletCache = new Set();

loadAndDisplayWallets(true);

// #region Page Event Handlers
addEventListener('keyup', handleKeyPress, true);

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

$('#add-to-list').on('click', () => {
   addNewWallet();
})

$('#cancel-add').on('click', () => {
   $('#add-wallet').hide();
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
      $('#show-actual-balance').addClass('btn-secondary');
      $('#show-actual-balance').removeClass('btn-primary');
      $('#show-recoverable-balance').addClass('btn-primary');
      $('#show-recoverable-balance').removeClass('btn-secondary');
      getWalletRecoverableBalances();
      actualBalanceDisplayed = false;
   }
})

$('#open-nft-recovery').on('click', () => {
   $('#nft-recovery').hide();
   openNFTRecoverySite();
})

// #endregion

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
            showErrorMessage("The wallet (" + walletStr + ") already exists.", 5000);
         }
      }
      else
      {
         showErrorMessage("The wallet is currently unsupported.  You entered (" + walletStr + ").", 5000);
      }

      return true;
   });

   $('#Wallet').val(null);
}

function loadWalletDetails(coin)
{
   logger.info('Sending open-wallet-details event');
   ipcRenderer.send('open-wallet-details', [coin]);
}

function openNFTRecoverySite()
{
   clipboard.writeText(clientConfigObj.launcherid);

   logger.info('Sending open-nft-recovery-site event');
   ipcRenderer.send('open-nft-recovery-site', [clientConfigObj.launcherid]);
}

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
            ipcRenderer.send('async-get-wallet-balance', [wallet, coinCfg.coinApiName, coinCfg.multiplier]);
         }
      }
      else
      {
         logger.error("Unable to Add Entry for unsupported wallet (" + walletStr + ").");
      }

   }
}

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

// #region Coin Config

function getCoinConfigForWallet(wallet)
{
   let coinConfig;
   let coinConfigFound = false;
   coinConfigObj.every((cfg) => {
      if (wallet.startsWith(cfg.coinSymbol))
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
      logger.error('Unable to locate coin configuration settings for ' + wallet);
   }
}

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
      logger.error('Unable to locate coin configuration settings for ' + wallet);
   }
}

// #endregion

// #region Wallet Functions
function buildWalletCard(wallet, coinCfg)
{
   let imgPath = coinImgPath.replace('{0}', coinCfg.coinApiName);
   
   let updateString = cardTemplate.replace('{0}', coinCfg.coinName).replace('{1}', coinCfg.coinApiName).replace('{2}', imgPath).replace('{3}', coinCfg.coinApiName).replace('{4}', coinCfg.coinSymbol);

   if ($('#'+coinCfg.coinApiName+'-card').length == 0)
      $('#wallet-cards').append(updateString);
}

function getWalletBalances()
{
   $('#nft-recovery').hide();

   walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

   $('.walletCard').remove();

   loadAndDisplayWallets(true);
}

function getWalletRecoverableBalances()
{
   $('#nft-recovery').hide();

   if (clientConfigObj != null && clientConfigObj.launcherid != null && clientConfigObj.launcherid.length > 0)
   {
      $('.walletCard').remove();

      loadAndDisplayWallets(false);

      // No Pending Balance to be displayed for Chia
      coinConfigObj.every((cfg) => {
         if (!cfg.isRecoverable)
         {
            $('#'+cfg.coinApiName+'-card .spinner-border').remove();
            $('#'+cfg.coinApiName+'-card .card-text').text('N/A');
         }
         return true;
      });

      logger.info('Sending async-get-recoverable-wallet-balance event')
      ipcRenderer.send('async-get-recoverable-wallet-balance', [clientConfigObj.launcherid]);
   }
   else
   {
      showErrorMessage("Unable to get recoverable balances.  Enter your chia launcherid into ./config/clientconfig.json", 1000);
   }
}
// #endregion

// #region Async Event Handlers
// Async message handler
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-wallet-balance-reply event')
   if (arg.length == 4)
   {
      let coin = arg[0];
      let balance = convertFromMojo(arg[2]);
      let balanceBefore = convertFromMojo(arg[3]);
      let change = balance - balanceBefore;
    
      if ($('#'+coin+'-card .card-text').length != 0)
      {
         //Remove loading spinner if present
         $('#'+coin+'-card .spinner-border').remove();

         currentBalance = $('#'+coin+'-card .card-text .balance').text();
         currentBalanceChange = $('#'+coin+'-card .balanceChange').text();
         currentWalletCount = Number($('#'+coin+'-card #walletCount').text()) + 1;

         $('#'+coin+'-card #walletCount').text(Number(currentWalletCount));
         $('#'+coin+'-card #walletCountLabel').text(" wallet" + ((currentWalletCount > 1) ? "s" : ""));

         if (currentBalance == "" && !isNaN(balance))
         {
            $('#'+coin+'-card .card-body .balance').text(balance.toLocaleString());
         }
         else if (!isNaN(balance) && !isNaN(currentBalance))
         {
            $('#'+coin+'-card .card-body .balance').text((Number(balance) + Number(currentBalance)).toLocaleString());
         }
         else
         {
            logger.error('Numbers in incorrect formats');
         }

         let pos_chg_icon = '<span style="color: green"><i class="fas fa-caret-up"></i></span>';
         let neg_chg_icon = '<span style="color: red"><i class="fas fa-caret-down"></i></span>';
         let balanceChange = 0;

         if (currentBalanceChange == "" && !isNaN(change))
            balanceChange = Number(change);
         else if (!isNaN(change) && !isNaN(currentBalanceChange))
            balanceChange = Number(currentBalanceChange) + Number(change)
         else
            console.log('Numbers in incorrect formats');

         $('#'+coin+'-card .balanceChangeSymbol span').remove();
         if (balanceChange > 0)
         {
            $('#'+coin+'-card .balanceChange').text(balanceChange.toLocaleString());
            $('#'+coin+'-card .balanceChangeSymbol').append(pos_chg_icon);
         }
         else if (balanceChange < 0)
         {
            $('#'+coin+'-card .balanceChange').text(balanceChange.toLocaleString());
            $('#'+coin+'-card .balanceChangeSymbol').append(neg_chg_icon); 
         }
         else
         $('#'+coin+'-card .balanceChange').text(balanceChange.toLocaleString());
      }
   }
   else
   {
      logger.error('Reply args incorrect');
   }
})

ipcRenderer.on('async-get-recoverable-wallet-balance-reply', (event, arg) => {
   logger.info('Received async-get-recoverable-wallet-balance-reply event')
   if (arg.length > 1)
   {
      arg.every((recovBal) => {
         let coin = recovBal.pathName;
         let balance = convertFromMojo(recovBal.availableAmount);

         if ($('#'+coin+'-card .card-text').length != 0)
         {
            //Remove loading spinner if present
            $('#'+coin+'-card .spinner-border').remove();

            if ($('#'+coin+'-card .card-text').text() != 'N/A')
            {
               $('#'+coin+'-card .card-text').text(balance.toLocaleString());
            }

            //if (Number(balance) != 0)
            //{
               $('#nft-recovery').show();
            //}
         }

         return true;
      });
   }
   else
   {
      logger.error('Reply args incorrect');
   }
})

ipcRenderer.on('async-refresh-wallets', (event, arg) => {
   logger.info('Received async-refresh-wallets event');
   /*$.ajax({
      url: "https://chiaforkscalculator.com",
      dataType: 'text',
      success: function(data) {
           var elements = $("<div>").html(data)[0].getElementsByTagName("ul")[0].getElementsByTagName("li");
           for(var i = 0; i < elements.length; i++) {
                var theText = elements[i].firstChild.nodeValue;
                // Do something here
           }
      }
 });*/
   if (actualBalanceDisplayed)
      getWalletBalances();
   else
      getWalletRecoverableBalances();
})

ipcRenderer.on('async-add-wallet', (event, arg) => {
   logger.info('Received async-add-wallet event');
   $('#add-wallet').show();
})
// #endregion

// #region Utility Functions
function showErrorMessage(message, timeout)
{
   logger.error(message)
   $('#alertBox').text(message);
   $('#alertBox').show();
   setTimeout(
      function() {
         $('#alertBox').hide();
      }, timeout
   );
}

function convertFromMojo(mojoValue)
{
      return mojoValue/1000000000000;
}
// #endregion