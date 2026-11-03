@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  CẬP NHẬT DỮ LIỆU VĂN BẢN TỪ FILE WORD
 echo ============================================
where py >nul 2>nul
if %errorlevel%==0 (set "PY=py -3") else (set "PY=python")
%PY% --version >nul 2>nul
if errorlevel 1 (
  echo [LỖI] Chưa cài Python 3.
  pause
  exit /b 1
)
%PY% -c "import docx" >nul 2>nul
if errorlevel 1 (
  echo Chưa có python-docx. Đang thử cài...
  %PY% -m pip install -r requirements.txt
  if errorlevel 1 (echo [LỖI] Không cài được python-docx. & pause & exit /b 1)
)
%PY% build_data.py
if errorlevel 1 (echo [LỖI] Xây dựng dữ liệu thất bại. & pause & exit /b 1)
echo [OK] Đã tạo data.js và data.json.
echo Tải các file đã thay đổi lên GitHub, hoặc chỉ thêm Word vào van-ban-goc nếu dùng GitHub Actions.
pause
