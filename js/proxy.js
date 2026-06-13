// ==================== CORS PROXIES ====================
export const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
];

export async function fetchViaProxy(url, timeout=8000) {
  for (const proxyFn of PROXIES) {
    const proxyUrl = proxyFn(url);
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(()=>ctrl.abort(), timeout);
      const r = await fetch(proxyUrl, {signal:ctrl.signal, headers:{'Accept':'application/json,text/plain,*/*'}});
      clearTimeout(tid);
      if (!r.ok) continue;
      const text = await r.text();
      if (!text) continue;
      const trimmed = text.trim();
      if (trimmed.startsWith('<')) continue; // HTML error page
      // allorigins /get wraps in {contents:"..."}
      if (trimmed.startsWith('{"contents"')) {
        try { const w=JSON.parse(trimmed); if(w.contents) return JSON.parse(w.contents); } catch(e2){}
        continue;
      }
      return JSON.parse(trimmed);
    } catch(e) { /* try next proxy */ }
  }
  return null;
}
