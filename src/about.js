// #region Const Definitions
const {ipcRenderer} = require('electron');
const logger = require('electron-log');
const path = require('path');
logger.transports.file.resolvePath = () => path.join(__dirname, 'logs/about.log');
let $ = require('jquery');

const DisplayTheme = {
   Dark: 'Dark',
   Light: 'Light'
};
// #endregion
/*
$(function () {
   console.log(app.getVersion());
});
*/

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet detail page renders
// ************************
ipcRenderer.on('app-version-reply', (event, arg) => {
   logger.info('Received app-version-reply event');
   
   if (arg.length == 1) {
      let version = arg[0];

      $('#appVersion').text(`Version ${version}`);
   }
   else {
      logger.error('Reply args incorrect');
   }
});