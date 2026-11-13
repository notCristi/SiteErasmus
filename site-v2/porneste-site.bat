@echo off
rem Porneste site-ul pe calculator ca pe un site adevarat (vezi CITESTE.md, "Cum il testezi").
cd /d "%~dp0"
node scripts\server.cjs
if errorlevel 1 echo. & echo   Nu a pornit. Verifica daca Node.js e instalat: https://nodejs.org
pause
