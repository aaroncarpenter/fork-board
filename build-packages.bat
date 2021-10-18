cd c:\users\amcar\source\repos\chia-forks-dashboard	
del .\dist\chia-forks-dashboard-win32-x64\resources\app\resources\config\wallets.json

electron-packager . chia-forks-dashboard --all --out dist\ --overwrite

electron-installer-windows --src dist\chia-forks-dashboard-win32-x64\ --dest dist\installers\

