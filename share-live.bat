@echo off
setlocal
cd /d "%~dp0"
echo Starting live share tunnel (keep this window open while sharing)...
echo The shareable URL appears below — send it to anyone. They can view AND edit.
echo Leads stay private to this PC. Close this window to stop sharing.
echo.
ssh -o StrictHostKeyChecking=accept-new -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -R 80:localhost:4820 nokey@localhost.run
pause
