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

$(function () {
   $('body').addClass('dark-mode');
});


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
// Purpose: This function is a handler for an event from ipcMain, triggered when the about page renders
// ************************
ipcRenderer.on('load-about-page', (event, arg) => {
   logger.info('Received load-about-page event');
   
   if (arg.length == 3) {
      let version = arg[0];
      let processPlatform = arg[1];
      let processArch = arg[2];
      let platform = (processPlatform == 'darwin' ? 'MacOS' : (processPlatform == 'win32' ? "Windows" :  (processPlatform == 'linux' ? "Linux" : processPlatform)));

      $('#appName').text(`ForkBoard v${version}`);

      $('#appPlatform').text(`for ${platform} (${processArch})`);

      if (processPlatform != 'darwin') {
         $('#close-button-div').hide();
      }
   }
   else {
      logger.error('Reply args incorrect');
   }
});
// #endregion