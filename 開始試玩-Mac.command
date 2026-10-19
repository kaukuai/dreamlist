#!/usr/bin/env bash
cd "$(dirname "$0")"
node preview.mjs
if [ $? -ne 0 ]; then
  read -r -p "請保留上方錯誤訊息。按 Enter 結束。"
fi
