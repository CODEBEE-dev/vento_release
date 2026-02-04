@echo off
REM Vento launcher script
REM Usage:
REM   vento           - Run yarn install + yarn start
REM   vento -fast     - Run yarn start-fast (skip install)
REM   vento dev       - Run in development mode (yarn install + dev)
REM   vento dev-fast  - Run in development mode (skip install)
REM   vento kill      - Stop all processes
REM   vento --help    - Show help

cd /d "%~dp0"

REM Detect node: prefer local bin\node.exe, fallback to system
if exist "bin\node.exe" (
    set NODE=bin\node.exe
    echo Using local node: %NODE%
) else (
    set NODE=node
    echo Using system node: %NODE%
)

set YARN=%NODE% .yarn\releases\yarn-4.1.0.cjs

if "%1"=="--help" (
    %NODE% vento.js --help
    goto :eof
)

if "%1"=="-h" (
    %NODE% vento.js --help
    goto :eof
)

if "%1"=="dev" (
    %YARN% && %YARN% dev
    goto :eof
)

if "%1"=="dev-fast" (
    %YARN% dev-fast
    goto :eof
)

if "%1"=="-fast" (
    %YARN% start-fast
    goto :eof
)

if "%1"=="kill" (
    %YARN% kill
    goto :eof
)

if "%1"=="add-user" (
    if "%2"=="" goto :add_user_usage
    if "%3"=="" goto :add_user_usage
    if "%4"=="" goto :add_user_usage
    pushd apps\vento
    if exist "..\..\bin\node.exe" (
        ..\..\bin\node.exe addUser.js %2 %3 %4
    ) else (
        node addUser.js %2 %3 %4
    )
    popd
    goto :eof
)

%YARN% && %YARN% start
goto :eof

:add_user_usage
echo Usage: vento add-user ^<email^> ^<password^> ^<type^>
goto :eof
