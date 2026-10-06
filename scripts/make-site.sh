#!/usr/bin/env sh
# 公開するファイルだけを _site/ に集める（GitHub Pages / Cloudflare Pages 共通）
set -eu
rm -rf _site
mkdir -p _site
cp -r index.html gallery.js gallery.css manifest.webmanifest sw.js _headers .nojekyll apps shared ideas products docs _site/
echo "_site/ を作成しました"
