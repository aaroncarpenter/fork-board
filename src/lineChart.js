// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const remote = require('electron').remote;
const logger = require('electron-log');
const { chart, Chart } = require('chart.js');
logger.transports.file.resolvePath = () => path.join(__dirname, '../logs/lineChart.log');
const Utils = require('./utils');
const DisplayTheme = {
   Dark: 'Dark',
   Light: 'Light'
};
const DaysField = {
   30: '30',
   60: '60',
   90: '90'
};
// #endregion

// #region Variable Definitions
let utils = new Utils();

let $ = require('jquery');
let fs = require('fs');
let path = require('path');

let graphCfg = {};
let clientCfg = {};
let exchangeRateObj = {};
let displayTheme;
let showCloseButton = false;
let graphDaysFilter = 30;

let forkboardChartObj; 
// #endregion

$(function () {
   addEventListener('keyup', handleKeyPress, true);
   $('#days-dropdown-text').text(`Filter: Last ${graphDaysFilter} Days`);
   forkboardChartObj = new Chart(document.getElementById('forkboardChart'),{});
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
   ipcRenderer.send('close-line-graph', []);
}

// #endregion

// #region Graph Functions

// ***********************
// Name: 	loadLineGraph  
// Purpose: This function is handles clearing and re-adding the wallet cards.
//    Args: N/A
//  Return: N/A
// *************************
function loadLineGraph() {  
   logger.info('Sending async-get-line-graph-data event');
   ipcRenderer.send('async-get-line-graph-data', [clientCfg.launcherId.split(',')[0], graphCfg]);
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
      $('div.dropdown-content').addClass('dark-mode');
      $('div.card-header').addClass('dark-mode');
   }
   else {
      $('body').removeClass('dark-mode');
      $('div.dropdown-content').removeClass('dark-mode');
      $('div.card-header').removeClass('dark-mode');
   }
}

// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the line graph page renders
// ************************
ipcRenderer.on('load-line-graph', (event, arg) => {
   logger.info('Received load-line-graph event');

   if (arg.length == 4) {
      graphCfg = arg[0];
      clientCfg = arg[1];
      exchangeRateObj = arg[2];
      let processPlatform = arg[3];

      logger.info(`Loading details for ${graphCfg.dataDisplayName}`);
      loadLineGraph();

      //Setting theme
      setDisplayTheme();

      if (processPlatform != 'darwin') {
         $('#darwin-window-title').hide();
         $('#darwin-window-close').hide();
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

   if (forkboardChartObj != undefined)
   {
      forkboardChartObj.destroy();
   }

   $(document).attr("title", graphCfg.windowTitle);
   $('#darwin-window-title').text(graphCfg.windowTitle);

   let exchangeRate = utils.getUSDExchangeRate(clientCfg.appSettings.currency, exchangeRateObj);
   logger.info(`Exchange rate is ${exchangeRate}`);
   
   if (arg.length == 1) {
      let graphData = arg[0];

      logger.info(`Received ${graphData.length} rows`);

      let groupDateLbls = [];
      let groupCountVals = [];
      let groupValueVals = [];

      graphData.every(function (dataGrp) {
         groupDateLbls.push(new Date(dataGrp.date).toLocaleDateString());
         groupCountVals.push(dataGrp.balance);
         groupValueVals.push(utils.roundToPreferredDecimalPlaces(dataGrp.balanceUSD, 2) * exchangeRate);
         return true;
      });
     
      let groupDatasets = [];
      let scales = {};
      let plugins = {};

      groupDatasets.push({
         label: `${graphCfg.primaryYAxisLabel} (${clientCfg.appSettings.currency})`,
         backgroundColor: 'rgb(0, 128, 0)',
         borderColor: 'rgb(0, 128, 0)',
         data: groupValueVals,
         yAxisID: 'y',
         tension: 0.2
       });

      scales.y = {
         type: 'linear',
         display: true,
         position: 'left',
         title: {
            display: true,
            text: `${graphCfg.primaryYAxisLabel} (${clientCfg.appSettings.currency})`
         },
         ticks: {
            // Include a dollar sign in the ticks
            callback: function(value, index, ticks) {
                return value.toLocaleString(utils.getLocaleFromCurrency(clientCfg.appSettings.currency), {style: 'currency', currency: clientCfg.appSettings.currency, minimumFractionDigits: 0, maximumFractionDigits: 4});
            }
        }
      };

      if (graphCfg.showCoinCountLine)
      {
         groupDatasets.push({
            label: `Coins`,
            backgroundColor: 'rgb(229, 232, 232)',
            borderColor: 'rgb(229, 232, 232)',
            data: groupCountVals,
            yAxisID: 'y1',
            borderDash: [5, 5],
            fill: false,
            tension: 0.2
         });

         scales.y1 = {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
               display: true,
               text: 'Coins'
            },
      
            // grid line settings
            grid: {
               drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
         };
      }

      
      scales.yAxes = [{
         ticks: {
            min: 0,
            callback: function(value, index, values) {
               return value.toLocaleString(utils.getLocaleFromCurrency(clientCfg.appSettings.currency),{style:"currency", currency: clientCfg.appSettings.currency});
            }
         }
      }];

      scales.x = {
         ticks: {
           // For a category axis, the val is the index so the lookup via getLabelForValue is needed
           callback: function(val, index) {
            // Hide every 2nd tick label
            return index % (graphCfg.daysFilter == 30 ? 2 : graphCfg.daysFilter == 60 ? 4 : 6) === 0 ? new Date(this.getLabelForValue(val)).toLocaleDateString() : '';
           }
         }
       }

      const data = {
         labels: groupDateLbls,
         datasets: groupDatasets
      };

      let delayed;
      const config = {
         type: 'line',
         data: data,
         options: {
            aspectRatio: 1,
            maintainAspectRatio: false,
            responsive: true,
            fill: false,
            interaction: {
               intersect: false
            },
            radius: 0,
            scales: scales,
            plugins: plugins
         }
      };
   
      forkboardChartObj = new Chart(
         document.getElementById('forkboardChart'),
         config
      );
   
   }
   else {
      logger.error('Reply args incorrect');
   }
});

// ***********************
// Name: 	updateSortOrder
// Purpose: This function changes the sort order.
//    Args: N/A
//  Return: N/A
// ************************
function updateDays(days) {
   logger.info(`Update Days filter to ${days}`);

   if (days != graphDaysFilter) {
      graphDaysFilter = days;

      $('#days-dropdown-text').text(`Filter: Last ${graphDaysFilter} Days`);

      graphCfg.daysFilter = graphDaysFilter;

      loadLineGraph();
   }
}
// #endregion