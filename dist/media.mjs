// Updating this revision avoids reusing the older large photos from browser caches.
export function assetUrl(src) {
  return src ? `${src}${src.includes('?') ? '&' : '?'}v=20261101-2` : '';
}

// Keep downloads bounded so background photos do not crowd out the current one.
export function createPhotoPreloader(makeImage = () => new Image(), concurrency = 3) {
  const jobs = new Map(), queue = [];
  let active = 0;
  function pump() {
    while (active < concurrency && queue.length) {
      const job = queue.shift(); active++;
      const image = makeImage(); job.image = image;
      image.decoding = 'async';
      const finish = success => {
        image.onload = image.onerror = null;
        active--; if (!success) jobs.delete(job.src);
        job.resolve(success); pump();
      };
      image.onload = async () => {
        try { if (image.decode) await image.decode(); finish(true); }
        catch { finish(false); }
      };
      image.onerror = () => finish(false);
      image.src = job.src;
    }
  }
  return function preload(src, priority = false) {
    const url = assetUrl(src);
    if (!url) return Promise.resolve(false);
    let job = jobs.get(url);
    if (!job) {
      job = { src: url };
      job.promise = new Promise(resolve => { job.resolve = resolve; });
      jobs.set(url, job); queue.push(job);
    }
    if (priority && queue.includes(job)) { queue.splice(queue.indexOf(job), 1); queue.unshift(job); }
    pump(); return job.promise;
  };
}

// Keep a visible embedded photo while the network version is being fetched.
export function showPreviewPhoto(image, photos, makeImage = () => new Image()) {
  image.decoding = 'async';
  image.src = photos.preview || assetUrl(photos.front);
  const upgrade = makeImage();
  upgrade.decoding = 'async';
  upgrade.onload = () => { image.src = upgrade.src; };
  upgrade.onerror = () => {
    // Retry the full photo once; leave the embedded preview visible on failure.
    upgrade.onerror = null;
    upgrade.src = assetUrl(photos.front);
  };
  upgrade.src = assetUrl(photos.thumbnail || photos.front);
}
