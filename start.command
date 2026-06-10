#!/bin/bash
# Di chuyen vao thu muc chua script
cd "$(dirname "$0")"

# Tu dong cai dat dependencies neu chua co node_modules
if [ ! -d "node_modules" ]; then
  echo "=================================================="
  echo " -> Phat hien chua co thu vien node_modules."
  echo " -> Dang tu dong tai va cai dat cac thu vien can thiet..."
  echo " -> Viec nay chi thuc hien 1 lan dau tien."
  echo "=================================================="
  npm install
fi

echo "=================================================="
echo "      KHOI CHAY MACCLEANSE LOCAL (OFFLINE)        "
echo "=================================================="
echo "-> Dang khoi chay may chu local..."
echo "-> Trinh duyet cua ban se tu dong mo trong giay lat..."
echo "-> De dung ung dung, chi can dong cua so Terminal nay."
echo "=================================================="

# Mo trinh duyet tu dong sau 2 giay de doi may chu khoi dong
(sleep 2 && open "http://localhost:5173") &

# Chay may chu phat trien (backend + frontend)
npm run dev
