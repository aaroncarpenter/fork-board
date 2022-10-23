// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const remote = require('electron').remote;
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, '../logs/lineGraph.log');
const Utils = require('./utils');
const DisplayTheme = {
   Dark: 'Dark',
   Light: 'Light'
};
// #endregion

// #region Variable Definitions
let utils = new Utils();

let $ = require('jquery');
let fs = require('fs');
let path = require('path');

let walletFile = path.resolve(__dirname, '../assets/config/wallets.json');
let templateFile = path.resolve(__dirname, '../assets/templates/card-template-wallet-detail.html');
let cardTemplate = fs.readFileSync(templateFile, 'utf8');
let walletObj = JSON.parse(fs.readFileSync(walletFile, 'utf8'));

let coinCfg = {};
let clientCfg = {};
let exchangeRates = {};
let displayTheme;
let showCloseButton = false;
// #endregion

$(function () {
   addEventListener('keyup', handleKeyPress, true);
});

// #region Page Event Handlers

// ***********************
// Name: 	handleKeyPress
// Purpose: This functions send the event to close the graph pane to ipcMain.
//    Args: event
//  Return: N/A
// *************************
function handleKeyPress(event) {
   if (event.key == "Escape") {
      logger.info('Sending close-line-graph event');
      ipcRenderer.send('close-line-graph', []);
   }
}

// ***********************
// Name: 	closeWindow
// Purpose: This function handles specific close button implementation for MacOS
//    Args: N/A
//  Return: N/A
// *************************
function closeWindow() {
   ipcRenderer.send('close-line-graph', [coinCfg]);
}
// #endregion

// #region Wallet Functions

// ***********************
// Name: 	loadAndDisplayWallets
// Purpose: This function is handles clearing and re-adding the wallet cards.
//    Args: N/A
//  Return: N/A
// *************************
function loadLineGraph() {  
   // clearing any existing wallets
   const labels = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
    ];
  
    const data = {
      labels: labels,
      datasets: [{
        label: 'My First dataset',
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
        data: [0, 10, 5, 2, 20, 30, 45],
      }]
    };
  
    const config = {
      type: 'line',
      data: data,
      options: {}
    };

    const myChart = new Chart(
      document.getElementById('myChart'),
      config
    );

}

// ***********************
// Name: 	setDisplayTheme
// Purpose: This function sets the display theme
//    Args: N/A
//  Return: N/A
// ************************
function setDisplayTheme() {
   if (clientCfg.appSettings.displayTheme === DisplayTheme.Dark) {
      $('body').addClass('dark-mode');
      $('div.card-body').addClass('dark-mode');
      $('div.card-header').addClass('dark-mode');
      $('div.card-footer').addClass('dark-mode');
      $('div.alert.alert-info').addClass('dark-mode');
      $('div.card').addClass('dark-mode');
   }
   else {
      $('body').removeClass('dark-mode');
      $('div.card-body').removeClass('dark-mode');
      $('div.card-header').removeClass('dark-mode');
      $('div.card-footer').removeClass('dark-mode');
      $('div.alert.alert-info').removeClass('dark-mode');
      $('div.card').removeClass('dark-mode');
   }
}

// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet detail page renders
// ************************
ipcRenderer.on('load-line-graph', (event, arg) => {
   logger.info('Received load-line-graph event');
   
   if (arg.length == 5) {
      coinCfg = arg[0];
      clientCfg = arg[1];
      exchangeRates = arg[2];
      let processPlatform = arg[3];
      let processArch = arg[4];

      logger.info(`Loading details for ${coinCfg.coinDisplayName}`);
      loadLineGraph();

      //Setting theme
      setDisplayTheme();

      if (processPlatform != 'darwin') {
         $('#close-button-div').hide();
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ************************
// Purpose: This function receives the wallet balance reply from ipcMain, refreshes the coin data set balances and initiates the card refresh.
// ************************
ipcRenderer.on('async-get-line-graph-data-reply', (event, arg) => {
   logger.info('Received async-get-line-graph-data-reply event');
   
   if (arg.length == 4) {
      let wallet = arg[1];
      let balance = (arg[2] / coinCfg.mojoPerCoin);
      let balanceUSD = (coinCfg.coinPrice != null) ? balance * coinCfg.coinPrice : null;
    /*
      if ($('#'+wallet+'-card .card-text').length != 0) {
         $('#'+wallet+'-card .spinner-border').remove();
         $('#'+wallet+'-card .card-balances').show();

         if (balance != null) {
            $('#'+wallet+'-card .card-body .balance').text(utils.getAdjustedBalanceLabel(balance, clientCfg.appSettings.decimalPlaces));
            $('#'+wallet+'-card .card-body .balance').prop('title', balance);
         }

         $('#'+wallet+'-card #balance-currency-label').text(clientCfg.appSettings.currency.toLowerCase());

         if (balanceUSD != null && balance > 0) {
            $('#'+wallet+'-card .card-body .balance-currency').text(utils.getAdjustedCurrencyBalanceLabel(balanceUSD, clientCfg.appSettings.currency, exchangeRates));
         }
         else {
            $('#'+wallet+'-card .card-body .balance-currency').text('-');
         }
      }
      */
   }
   else {
      logger.error('Reply args incorrect');
   }
});
// #endregion