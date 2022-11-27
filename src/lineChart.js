// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const remote = require('electron').remote;
const logger = require('electron-log');
const { chart } = require('chart.js');
logger.transports.file.resolvePath = () => path.join(__dirname, '../logs/lineChart.log');
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

let graphCfg = {};
let clientCfg = {};
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
   }
   else {
      $('body').removeClass('dark-mode');
   }
}

// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the line graph page renders
// ************************
ipcRenderer.on('load-line-graph', (event, arg) => {
   logger.info('Received load-line-graph event');
   
   if (arg.length == 3) {
      graphCfg = arg[0];
      clientCfg = arg[1];
      let processPlatform = arg[2];

      logger.info(`Loading details for ${graphCfg.dataDisplayName}`);
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

   $(document).attr("title", `${graphCfg.windowTitle} History`);
   
   if (arg.length == 1) {
      let graphData = arg[0];

      logger.info(`Received ${graphData.length} rows`);

      let groupDateLbls = [];
      let groupCoinCountVals = [];
      let groupCoinValueVals = [];

      graphData.every(function (dataGrp) {
         groupDateLbls.push(new Date(dataGrp.date).toLocaleDateString());
         groupCoinCountVals.push(dataGrp.balance);
         groupCoinValueVals.push(dataGrp.balanceUSD);
         return true;
      });
     
      let groupDatasets = [];
      let scales = {};
      if (graphData[0].group.toUpperCase() != 'ACTUAL')
      {
         groupDatasets.push({
            label: `Coins`,
            backgroundColor: 'rgb(229, 232, 232)',
            borderColor: 'rgb(229, 232, 232)',
            data: groupCoinCountVals,
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

      groupDatasets.push({
         label: `Balance`,
         backgroundColor: 'rgb(0, 128, 0)',
         borderColor: 'rgb(0, 128, 0)',
         data: groupCoinValueVals,
         yAxisID: 'y',
         tension: 0.2
       });

      scales.y = {
         type: 'linear',
         display: true,
         position: 'left',
         title: {
            display: true,
            text: 'Balance'
         }
      };

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
            scales: scales
         }
       };
   
       const myChart = new Chart(
         document.getElementById('forkboardChart'),
         config
       );
   
   }
   else {
      logger.error('Reply args incorrect');
   }
});
// #endregion