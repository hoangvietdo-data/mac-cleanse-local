#!/bin/bash
# Di chuyen vao thu muc chua script
cd "$(dirname "$0")"

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
