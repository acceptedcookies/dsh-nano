onmessage = async () => {
  const r = {};
  try {
    const d = await navigator.storage.getDirectory();
    const f = await d.getFileHandle("probe.bin", { create: true });
    r.sahType = typeof f.createSyncAccessHandle;
    if (typeof f.createSyncAccessHandle === "function") {
      const h = await f.createSyncAccessHandle();
      r.sahWorks = true;
      await h.close();
    }
  } catch (e) { r.err = String(e); }
  r.sab = typeof SharedArrayBuffer;
  postMessage(r);
};
