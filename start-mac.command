#!/bin/bash
# ============================================================
#  BacklogUp かんたん起動 (macOS)
#  このファイルをダブルクリックするだけで使えます。
#  ※ 初回だけ「開発元が未確認」と出る場合は、ファイルを右クリック →
#     「開く」を選ぶと実行できます。
# ============================================================

# このスクリプトがある場所（リポジトリのルート）へ移動
cd "$(dirname "$0")" || exit 1

echo ""
echo "============================================================"
echo "  BacklogUp をはじめます (macOS)"
echo "============================================================"
echo ""

# --- Node.js があるか確認 ---
# Homebrew 等で /usr/local や /opt にある場合に備えて PATH を補強
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js がインストールされていません。"
  echo "    このツールを動かすには Node.js が必要です。"
  echo "    ブラウザで公式サイトを開きます。LTS 版をダウンロードして"
  echo "    インストールしたあと、もう一度このファイルをダブルクリックしてください。"
  echo ""
  open "https://nodejs.org/ja/download"
  echo ""
  read -r -p "Enter キーを押すと終了します... " _
  exit 1
fi

# --- 依存パッケージが未インストールなら install ---
if [ ! -d "node_modules" ]; then
  echo "[*] 初回セットアップ中です。少し時間がかかります（数分）..."
  echo ""
  if ! npm install; then
    echo ""
    echo "[!] セットアップに失敗しました。ネットワーク環境を確認して、もう一度お試しください。"
    echo ""
    read -r -p "Enter キーを押すと終了します... " _
    exit 1
  fi
fi

# --- かんたんメニューを起動 ---
npm start

echo ""
read -r -p "Enter キーを押すと終了します... " _
