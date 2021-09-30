let $ = require('jquery')
let fs = require('fs')
//const prompt = require('electron-prompt');
let walletFile = './config/wallets.json'
let cardTemplate = '<div id="{3}-card" class="walletCard col-md-4"><div class="card-header"><img style="height: 30px; width: 30px" src="{2}" class="card-img"> &nbsp;&nbsp;<b>{0}</b></div><div class="card"><div class="card-body"><h2 class="card-text"><div class="spinner-border" role="status"></div></h2></div></div><div class="card-footer"><small class="text-muted">{4}</small></div></div>';
const {ipcRenderer} = require('electron')
let walletCache = new Set();
let coinConfigObj = JSON.parse(fs.readFileSync('./config/coinconfig.json', 'utf8'));
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

$('#add-to-list').on('click', () => {
   let walletVal = $('#Wallet').val();

   $('#add-wallet').hide();

   if (!walletCache.has(walletVal))
   {
      walletObj.push({'wallet': walletVal});
      //fs.appendFile(walletFile, wallet + '\n');
      addEntry(walletVal);
      fs.writeFile(walletFile, JSON.stringify(walletObj, null, '\t'));
   }
   else
   {
      showErrorMessage("The wallet already exists.", 1000);
   }

   $('#Wallet').val(null);
})

$('#cancel-add').on('click', () => {
   $('#add-wallet').hide();
})

function addEntry(wallet, loadBalance) {
   if (wallet) {
      walletCache.add(wallet);
      let cardData = buildWalletCard(wallet)
      if (loadBalance)
         ipcRenderer.send('async-get-wallet-balance', cardData);
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

function buildWalletCard(wallet)
{
      let coinCfg = getCoinConfigForWallet(wallet);

      let updateString = cardTemplate.replace('{0}', coinCfg.coinName).replace('{1}', '...').replace('{2}', coinCfg.imgPath).replace('{3}', coinCfg.coinApiName).replace('{4}', coinCfg.coinSymbol);

      if ($('#'+coinCfg.coinApiName+'-card').length == 0)
         $('#wallet-cards').append(updateString);

      return [wallet, coinCfg.coinApiName, coinCfg.multiplier];
}

// Async message handler
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   if (arg.length == 2)
   {
      let coin = arg[0];
      let balance = arg[1];
    
      if ($('#'+coin+'-card .card-text').length != 0)
      {
         //Remove loading spinner if present
         $('#'+coin+'-card .spinner-border').remove();

         currentVal = $('#'+coin+'-card .card-text').text();

         if (currentVal == '...' && !isNaN(balance))
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

ipcRenderer.on('async-get-pending-recovery-balance-reply', (event, arg) => {
   if (arg.length > 1)
   {
      arg.every((recovBal) => {
         let coin = recovBal.pathName;
         let balance = recovBal.availableAmount;

         if ($('#'+coin+'-card .card-text').length != 0)
         {
            //Remove loading spinner if present
            $('#'+coin+'-card .spinner-border').remove();

            $('#'+coin+'-card .card-text').text(balance.toLocaleString());
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
   $('#appDisplayHeader').text('Actual Wallet Balance');

   $('.walletCard').remove();

   loadAndDisplayWallets(true);
})

ipcRenderer.on('async-show-actual-wallet-balance', (event, arg) => {
   $('#appDisplayHeader').text('Actual Wallet Balance');

   $('.walletCard').remove();

   loadAndDisplayWallets(true);
})

ipcRenderer.on('async-show-recoverable-wallet-balance', (event, arg) => {
   $('#appDisplayHeader').text('Recoverable Wallet Balance');

   $('.walletCard').remove();

   loadAndDisplayWallets(false);

   // No Pending Balance to be displayed for Chia
   $('#chia-card .spinner-border').remove();
   $('#chia-card .card-text').text('-');

   ipcRenderer.send('async-get-pending-recovery-balance', ['e72d87fddafb0ca93f88773069f5794e55915a4067efaa382673c08b3f2e64ec']);   
})

ipcRenderer.on('async-add-wallet', (event, arg) => {
   $('#add-wallet').show();
})

loadAndDisplayWallets(true);

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