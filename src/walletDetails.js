const {ipcRenderer} = require('electron');

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

addEventListener('keyup', handleKeyPress, true);

function handleKeyPress(event) {
   if (event.key == "Escape")
   {
      console.log('Sending close-wallet-details event');
      ipcRenderer.send('close-wallet-details', []);
   }
}

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

function loadAndDisplayWallets() {  
   // clearing any existing wallets
   $('.walletCard').remove();

   console.log('Loading Wallet Details for ' + coinName);
   //Check if file exists
   let coinCfg = getCoinConfigForCoin(coinName);

   $(document).attr("title", coinCfg.coinName + " Wallet Details");

   //$('#coinName').text(coinCfg.coinName)

   walletObj.every((w) => {
      if (w.wallet.startsWith(coinCfg.coinSymbol))
      {
         console.log('Loading Wallet Details for wallet: ' + w.wallet);
         buildWalletCard(w.wallet, coinCfg)

         ipcRenderer.send('async-get-wallet-balance', [w.wallet, coinCfg.coinApiName, coinCfg.multiplier]);
      }

      return true;
   });
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
      console.log('Unable to locate coin configuration settings for ' + coin);
   }
}

function buildWalletCard(wallet, coinCfg)
{
      let updateString = cardTemplate.replace('{0}', wallet).replace('{1}', wallet).replace('{2}', wallet).replace('{3}', coinCfg.coinSymbol);
      
      $('#wallet-cards').append(updateString);
}

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

ipcRenderer.on('load-wallet-details', (event, arg) => {
   console.log('Received load-wallet-details event');
   if (arg.length == 1)
   {
      coinName = arg[0];
      console.log('Loading details for ' + coinName);
      loadAndDisplayWallets();
   }
   else
   {
      console.log('Reply args incorrect');
   }
})

// Async message handler
ipcRenderer.on('async-get-wallet-balance-reply', (event, arg) => {
   console.log('Received async-get-wallet-balance-reply event');
   if (arg.length == 4)
   {
      let coin = arg[0];
      let wallet = arg[1];
      let balance = convertFromMojo(arg[2]);
      let balanceBefore = convertFromMojo(arg[3]);
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
            console.log('Numbers in incorrect formats');
         }
      }
   }
   else
   {
      console.log('Reply args incorrect');
   }
})

