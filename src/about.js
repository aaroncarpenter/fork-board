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

// #region Page Event Handlers
// ***********************
// Name: 	closeWindow
// Purpose: This function handles specific close button implementation for MacOS
//    Args: N/A
//  Return: N/A
// *************************
function closeWindow() {
   ipcRenderer.send('close-about-page', []);
}

// #endregion

// #region Electron Event Handlers

// ************************
// Purpose: This function is a handler for an event from ipcMain, triggered when the wallet detail page renders
// ************************
ipcRenderer.on('load-about-page', (event, arg) => {
   logger.info('Received load-about-page event');
   
   if (arg.length == 2) {
      let version = arg[0];
      let showCloseButton = arg[1];

      $('#appVersion').text(`Version ${version}`);

      if (!showCloseButton) {
         $('#close-button-div').hide();
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
});
// #endregion