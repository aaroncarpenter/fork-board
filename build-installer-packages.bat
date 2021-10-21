cd c:\users\amcar\source\repos\chia-forks-dashboard	

del .\dist\fork-board-win32-x64\resources\app\resources\config\wallets.json
del .\dist\fork-board-win32-x64\resources\app\resources\config\clientconfig.json

electron-installer-windows --src dist\fork-board-win32-x64\ --dest dist\installers\

