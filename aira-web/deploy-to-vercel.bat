@echo off
title Deploy AIRA Assistant to Vercel
echo ========================================================
echo         AIRA ASSISTANT - VERCEL DEPLOYMENT TOOL
echo ========================================================
echo.
cd /d "%~dp0"
echo Deploying the web download portal to Vercel...
echo If this is your first time, Vercel will open a browser to authenticate.
echo.
npx vercel --prod
echo.
echo ========================================================
echo Deployment process complete! Check the URL shown above.
echo ========================================================
pause
