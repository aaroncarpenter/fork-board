let $ = require('jquery');
let fs = require('fs');
let walletFile = './config/wallets.json';
let cardTemplate = '<div id="{3}-card" class="walletCard col-md-4" onclick="loadWalletDetails(\'{1}\')"><div class="card-header"><img style="height: 30px; width: 30px" src="{2}" class="card-img"> &nbsp;&nbsp;<b>{0}</b></div><div class="card"><div class="card-body"><h2 class="card-text"><div class="spinner-border" role="status"></div></h2></div></div><div class="card-footer"><div class="d-flex flex-row justify-content-between"><div><small class="text-muted">{4}</small></div><div><small class="text-muted"><span id="walletCount"></span><span id="walletCountLabel"></span></small></div></div></div>';
const {ipcRenderer, clipboard} = require('electron');
let walletCache = new Set();
let coinConfigObj = JSON.parse(fs.readFileSync('./config/coinconfig.json', 'utf8'));
let clientConfigObj = JSON.parse(fs.readFileSync('./config/clientconfig.json', 'utf8'));
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
let actualBalanceDisplayed = true;

loadAndDisplayWallets(true);

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
      $('#show-recoverable-balance').removeClass('btn-primary')
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
      $('#show-actual-balance').removeClass('btn-primary')
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

function addNewWallet()
{
   let walletVal = $('#Wallet').val();

   $('#add-wallet').hide();

   let walletArr = walletVal.split(',');

   walletArr.every((walletStr) => {
      walletStr = walletStr.trim();
      if (!walletCache.has(walletStr))
      {
         walletObj.push({'wallet': walletStr});
         addEntry(walletStr, actualBalanceDisplayed);
         fs.writeFile(walletFile, JSON.stringify(walletObj, null, '\t'));
      }
      else
      {
         showErrorMessage("The wallet already exists.", 1000);
      }

      return true;
   });

   $('#Wallet').val(null);
}

function loadWalletDetails(coin)
{
   ipcRenderer.send('open-wallet-details', [coin]);
}

function openNFTRecoverySite()
{
   clipboard.writeText(clientConfigObj.launcherid)
   ipcRenderer.send('open-nft-recovery-site', [clientConfigObj.launcherid]);
}

function addEntry(wallet, loadBalance) {
   if (wallet) {
      walletCache.add(wallet);
      let coinCfg = getCoinConfigForWallet(wallet);
      buildWalletCard(wallet, coinCfg)
      if (loadBalance)
      {
         ipcRenderer.send('async-get-wallet-balance', [wallet, coinCfg.coinApiName, coinCfg.multiplier]);
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
      console.log('Unable to locate coin configuration settings for ' + wallet);
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
      console.log('Unable to locate coin configuration settings for ' + wallet);
   }
}

function buildWalletCard(wallet, coinCfg)
{
      let updateString = cardTemplate.replace('{0}', coinCfg.coinName).replace('{1}', coinCfg.coinApiName).replace('{2}', coinCfg.imgPath).replace('{3}', coinCfg.coinApiName).replace('{4}', coinCfg.coinSymbol);

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

      ipcRenderer.send('async-get-recoverable-wallet-balance', [clientConfigObj.launcherid]);
   }
   else
   {
      showErrorMessage("Unable to get recoverable balances.  Enter your chia launcherid into ./config/clientconfig.json", 1000);
   }
}

// Async message handler
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
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

         currentVal = $('#'+coin+'-card .card-text').text();
         currentWalletCount = Number($('#'+coin+'-card #walletCount').text()) + 1;
         $('#'+coin+'-card #walletCount').text(Number(currentWalletCount));
         $('#'+coin+'-card #walletCountLabel').text(" wallet" + ((currentWalletCount > 1) ? "s" : ""));


         if (isNaN(currentVal) && !isNaN(balance))
         {
            $('#'+coin+'-card .card-text').text(balance.toLocaleString());
         }
         else if (!isNaN(balance) && !isNaN(currentVal))
         {
            $('#'+coin+'-card .card-text').text((Number(balance) + Number(currentVal)).toLocaleString());
         }
         else
         {
            console.log('Numbers in incorrect formats');
         }
      }
   }
   else
   {
      console.log('Reply args incorrect');
   }
})

ipcRenderer.on('async-get-recoverable-wallet-balance-reply', (event, arg) => {
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
      console.log('Reply args incorrect');
   }
})

ipcRenderer.on('async-refresh-wallets', (event, arg) => {
   if (actualBalanceDisplayed)
      getWalletBalances();
   else
      getWalletRecoverableBalances();
})

ipcRenderer.on('async-add-wallet', (event, arg) => {
   $('#add-wallet').show();
})

function showErrorMessage(message, timeout)
{
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

