@echo off
chcp 65001 >nul
setlocal

rem ============================================================
rem  BacklogUp かんたん起動 (Windows)
rem  このファイルをダブルクリックするだけで使えます。
rem ============================================================

rem このバッチがある場所（リポジトリのルート）へ移動
cd /d "%~dp0"

echo.
echo ============================================================
echo   BacklogUp をはじめます (Windows)
echo ============================================================
echo.

rem --- Node.js があるか確認 ---
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js がインストールされていません。
  echo     このツールを動かすには Node.js が必要です。
  echo     ブラウザで公式サイトを開きます。LTS 版をダウンロードして
  echo     インストールしたあと、もう一度このファイルをダブルクリックしてください。
  echo.
  start "" "https://nodejs.org/ja/download"
  echo.
  pause
  exit /b 1
)

rem --- 依存パッケージが未インストールなら install ---
if not exist "node_modules" (
  echo [*] 初回セットアップ中です。少し時間がかかります（数分）...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [!] セットアップに失敗しました。ネットワーク環境を確認して、もう一度お試しください。
    echo.
    pause
    exit /b 1
  )
)

rem --- かんたんメニューを起動 ---
call npm start

echo.
pause
endlocal
