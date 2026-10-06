// すべての試作ページ共通: フッターの「このアプリのデータを消す」ボタン
const btn = document.querySelector('[data-clear-data]');
if (btn) {
  btn.addEventListener('click', async () => {
    const slug = btn.dataset.clearData;
    if (!window.confirm('このアプリに保存したデータ（記録・写真・設定）をすべて消しますか？元に戻せません。')) return;
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith(`happy:${slug}:`)) localStorage.removeItem(k);
    } catch { /* ストレージ不可 */ }
    try { await new Promise((res) => { const r = indexedDB.deleteDatabase(`happy-${slug}`); r.onsuccess = r.onerror = r.onblocked = res; }); } catch { /* noop */ }
    location.reload();
  });
}
