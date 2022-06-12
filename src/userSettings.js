// #region Const Definitions
const {ipcRenderer, clipboard} = require('electron');
const remote = require('electron').remote;
const logger = require('electron-log');
logger.transports.file.resolvePath = () => path.join(__dirname, '../logs/userSettings.log');
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

let clientCfgFile = path.resolve(__dirname, '../assets/config/clientconfig.json');
let clientCfg = JSON.parse(fs.readFileSync(clientCfgFile, 'utf8'));

let displayTheme;
let showCloseButton = false;
let settingsUpdated = false;
// #endregion

$(function () {
   addEventListener('keyup', handleKeyPress, true);
});

// #region Page Event Handlers

// ***********************
// Name: 	handleKeyPress
// Purpose: This functions send the event to close the user settings pane to ipcMain.
//    Args: event
//  Return: N/A
// *************************
function handleKeyPress(event) {
   if (event.key == "Escape") {
      logger.info('Sending close-user-settings event');
      ipcRenderer.send('close-user-settings', []);
   }
}

// ***********************
// Name: 	setDecimalPlaces
// Purpose: This functions send the set decimal places event
//    Args: places
//  Return: N/A
// *************************
function setDecimalPlaces(places) {
   logger.info(`In Decimal Places handler, with places = ${places}`);
   if (clientCfg.appSettings.decimalPlaces == null || clientCfg.appSettings.decimalPlaces != places)
   {
      settingsUpdated = true;

      clientCfg.appSettings.decimalPlaces = places;

      $('#decimal-places button').removeClass('btn-primary');
      $('#decimal-places button').addClass('btn-secondary');
      $(`#decimal-places-${places}`).removeClass('btn-secondary');
      $(`#decimal-places-${places}`).addClass('btn-primary');

   }
}

// ***********************
// Name: 	setRefreshInterval
// Purpose: This functions handles the set interval event.
//    Args: interval
//  Return: N/A
// *************************
function setRefreshInterval(interval) {
   logger.info(`In Refresh Interval handler, with interval = ${interval}`);
   if (clientCfg.appSettings.autoRefreshInterval == null || clientCfg.appSettings.autoRefreshInterval != interval)
   {
      settingsUpdated = true;

      clientCfg.appSettings.autoRefreshInterval = interval;

      $('#refresh-interval button').removeClass('btn-primary');
      $('#refresh-interval button').addClass('btn-secondary');
      $(`#refresh-interval-${interval}`).removeClass('btn-secondary');
      $(`#refresh-interval-${interval}`).addClass('btn-primary');
   }
}

// ***********************
// Name: 	setAutoRefresh
// Purpose: This functions handles the set refresh event.
//    Args: status
//  Return: N/A
// *************************
function setAutoRefresh(active) {
   logger.info(`In Auto Refresh handler, with status = ${active}`);
   if (clientCfg.appSettings.autoRefreshEnabled == null || clientCfg.appSettings.autoRefreshEnabled != active)
   {
      settingsUpdated = true;

      clientCfg.appSettings.autoRefreshEnabled = active;

      $('#auto-refresh button').removeClass('btn-primary');
      $('#auto-refresh button').removeClass('btn-secondary');
      if (active)
      {
         $('#auto-refresh-off').addClass('btn-secondary');
         $('#auto-refresh-on').addClass('btn-primary');
      }
      else {
         $('#auto-refresh-on').addClass('btn-secondary');
         $('#auto-refresh-off').addClass('btn-primary');
      }
   }
}

// ***********************
// Name: 	setDisplayTheme
// Purpose: This functions send the set display theme event
//    Args: theme
//  Return: N/A
// *************************
function setDisplayTheme(theme) {
   logger.info(`In Display Theme handler, with theme = ${theme}`);
   if (clientCfg.appSettings.displayTheme == null || clientCfg.appSettings.displayTheme != theme)
   {
      settingsUpdated = true;

      clientCfg.appSettings.displayTheme = theme;

      $('#display-theme button').removeClass('btn-primary');
      $('#display-theme button').addClass('btn-secondary');
      $(`#display-theme-${theme}`).removeClass('btn-secondary');
      $(`#display-theme-${theme}`).addClass('btn-primary');

      setTheme();
   }
}

// ***********************
// Name: 	closeUserSettings
// Purpose: This function handles saving the settings to the configuration file and setting the refresh flag.
//    Args: wallet - the wallet to remove
//  Return: N/A
// *************************
function closeUserSettings() {
   if (settingsUpdated)
   {
      //write the new wallet file
      fs.writeFileSync(clientCfgFile, JSON.stringify(clientCfg, null, '\t'));

      ipcRenderer.send('async-set-dashboard-refresh-flag', []);
   }

   closeWindow();
}

// ***********************
// Name: 	closeWindow
// Purpose: This function handles specific close button implementation for MacOS
//    Args: N/A
//  Return: N/A
// *************************
function closeWindow() {
   ipcRenderer.send('close-user-settings', []);
}
// #endregion

// #region Wallet Functions

// ***********************
// Name: 	loadSettings
// Purpose: This function handles .oading the existing settings.
//    Args: N/A
//  Return: N/A
// *************************
function loadSettings() {  
   logger.info(`Loading User Settings`);

   let refreshInterval = clientCfg.appSettings.autoRefreshInterval;
   let refreshEnabled = clientCfg.appSettings.autoRefreshEnabled;
   let decimalPlaces = clientCfg.appSettings.decimalPlaces;
   let displayTheme = clientCfg.appSettings.displayTheme;

   logger.info(`Loading Auto Refresh  - ${refreshEnabled}`);
   logger.info(`Loading Refresh Interval - ${refreshInterval}`);
   logger.info(`Loading Decimal Places - ${decimalPlaces}`);
   logger.info(`Loading Display Theme - ${displayTheme}`);

   //Set default values
   if (refreshInterval == null) {
      refreshInterval = "5";
   }

   if (decimalPlaces == null) {
      decimalPlaces = "2";
   }

   if (displayTheme == null) {
      displayTheme = DisplayTheme.Light;
   }

   if (refreshEnabled == null) {
      refreshEnabled = true;
   }
      
   // clear all buttons
   $('#refresh-interval .btn').removeClass('btn-primary');
   $('#refresh-interval .btn').addClass('btn-secondary');
   $(`#refresh-interval-${refreshInterval}`).removeClass('btn-secondary');
   $(`#refresh-interval-${refreshInterval}`).addClass('btn-primary');
  
   $('#decimal-places .btn').removeClass('btn-primary');
   $('#decimal-places .btn').addClass('btn-secondary');
   $(`#decimal-places-${decimalPlaces}`).removeClass('btn-secondary');
   $(`#decimal-places-${decimalPlaces}`).addClass('btn-primary');

   $('#display-theme .btn').removeClass('btn-primary');
   $('#display-theme .btn').addClass('btn-secondary');
   $(`#display-theme-${displayTheme}`).removeClass('btn-secondary');
   $(`#display-theme-${displayTheme}`).addClass('btn-primary');

   $('#auto-refresh button').removeClass('btn-primary');
   $('#auto-refresh button').removeClass('btn-secondary');
   if (refreshEnabled)
   {
      $('#auto-refresh-off').addClass('btn-secondary');
      $('#auto-refresh-on').addClass('btn-primary');
   }
   else {
      $('#auto-refresh-on').addClass('btn-secondary');
      $('#auto-refresh-off').addClass('btn-primary');
   }
}

// ***********************
// Name: 	setTheme
// Purpose: This function sets the dispaly theme from configuration
//    Args: N/A
//  Return: N/A
// ************************
function setTheme() {
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
ipcRenderer.on('load-user-settings', (event, arg) => {
   logger.info('Received load-user-settings event');
   
   if (arg.length == 2) {
      let processPlatform = arg[0];
      let processArch = arg[1];
      
      logger.info(`Loading User Settings`);
      loadSettings();

      //Setting theme
      setTheme();
      
      if (processPlatform != 'darwin') {
         $('#close-button-div').hide();
      }
   }
});
// #endregion