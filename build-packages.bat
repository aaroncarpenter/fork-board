cd c:\users\amcar\source\repos\chia-forks-dashboard	

electron-packager . chia-forks-dashboard --platform win32 --arch x64 --out dist\

electron-installer-windows --src dist\chia-forks-dashboard-win32-x64\ --dest dist\installers\