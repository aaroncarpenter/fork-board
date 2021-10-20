cd c:\users\amcar\source\repos\chia-forks-dashboard	
del .\dist\chia-forks-dashboard-win32-x64\resources\app\resources\config\wallets.json
del .\dist\chia-forks-dashboard-win32-x64\resources\app\resources\config\clientconfig.json

electron-packager . fork-board --all --out dist\ --overwrite

electron-installer-windows --src dist\fork-board-win32-x64\ --dest dist\installers\

