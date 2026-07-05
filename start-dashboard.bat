@echo off
cd /d "%~dp0"
start "" http://localhost:4820
node server.js
