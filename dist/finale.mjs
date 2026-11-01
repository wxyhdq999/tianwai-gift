import { cities } from './records.mjs';
import { chronological, validOrder, canArrange, confirmOrder } from './journey-state.mjs';
import { birthday } from './birthday.mjs';

export function createFinale({ getState, save, showMap, openRecord, goHome }) {
  const $ = id => document.getElementById(id);
  const byId = id => chronological.find(record => record.id === id);
  const position = record => cities.find(city => city.id === record.cityId);
  let selected = null, run = null, arrived = new Set();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function refresh() {
    const state = getState();
    $('journey-entry').hidden = !canArrange(state);
    $('arrange-journey').hidden = state.archived;
    $('replay-journey').hidden = !state.archived;
    $('read-birthday').hidden = !state.archived;
    $('route-lit').classList.toggle('active', state.archived);
  }
  function openSort() {
    const state = getState(); if (!canArrange(state)) return;
    if (!validOrder(state.routeOrder)) {
      const order = chronological.map(record => record.id);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      if (order.every((id, i) => id === chronological[i].id)) order.reverse();
      state.routeOrder = order; save();
    }
    selected = null; $('sort-feedback').textContent = ''; renderSort(); $('sort-dialog').showModal();
  }
  function renderSort(focusIndex) {
    $('sort-cards').replaceChildren(...getState().routeOrder.map((id, index) => {
      const record = byId(id), button = document.createElement('button');
      button.className = 'sort-card'; button.type = 'button';
      button.setAttribute('aria-label', `第${index + 1}位：${record.city}`);
      button.setAttribute('aria-pressed', String(selected === index));
      const image = document.createElement('img'); image.src = record.photos.front; image.alt = `${record.city}现场`; image.draggable = false;
      const number = document.createElement('span'); number.className = 'sort-number'; number.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('span'); label.textContent = record.city;
      button.append(number, image, label);
      button.addEventListener('click', () => {
        if (selected === null) { selected = index; renderSort(index); }
        else if (selected === index) { selected = null; renderSort(index); }
        else {
          const state = getState(); [state.routeOrder[selected], state.routeOrder[index]] = [state.routeOrder[index], state.routeOrder[selected]];
          selected = null; save(); $('sort-feedback').textContent = ''; renderSort(index);
        }
      }); return button;
    }));
    if (focusIndex !== undefined) $('sort-cards').children[focusIndex]?.focus({ preventScroll: true });
  }
  $('confirm-route').addEventListener('click', () => {
    if (!confirmOrder(getState(), getState().routeOrder)) { $('sort-feedback').textContent = '有几站还没对上，再想想。'; return; }
    save(); refresh(); $('sort-dialog').close(); play();
  });
  function stop() {
    run?.abort(); run = null;
    $('paper-plane').getAnimations().forEach(animation => animation.cancel());
  }
  function showLetter() {
    if (!getState().archived) return;
    getState().letterOpened = true; save();
    $('birthday-date').textContent = birthday.date; $('birthday-title').textContent = birthday.title;
    $('birthday-message').replaceChildren(...birthday.message.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    if (birthday.letterImages.length) {
      $('birthday-message').replaceChildren(...birthday.letterImages.map((src, index) => {
        const image = document.createElement('img'); image.src = src; image.alt = `手写信，第${index + 1}页`; image.className = 'handwritten-page';
        return image;
      }));
    }
    if (!$('birthday-dialog').open) $('birthday-dialog').showModal();
  }
  function drawStops() {
    $('flight-stops').replaceChildren(); $('flight-routes').replaceChildren();
    for (const city of cities) {
      const node = document.createElement('div'); node.className = 'flight-city'; node.id = `flight-${city.id}`;
      node.style.left = `${city.x}%`; node.style.top = `${city.y}%`;
      const dot = document.createElement('span'); dot.className = 'flight-dot';
      const name = document.createElement('span'); name.className = 'flight-city-name'; name.textContent = city.name;
      const previews = document.createElement('div'); previews.className = 'flight-previews';
      for (const record of chronological.filter(record => record.cityId === city.id)) {
        const button = document.createElement('button'); button.className = 'mini-ticket'; button.id = `preview-${record.id}`;
        button.disabled = true; button.setAttribute('aria-label', `回看${record.city} ${record.date}`);
        const image = document.createElement('img'); image.src = record.photos.front; image.alt = '';
        const date = document.createElement('small'); date.textContent = record.date.slice(5);
        button.append(image, date); button.addEventListener('click', () => openRecord(record.id)); previews.append(button);
      }
      node.append(dot, name, previews); $('flight-stops').append(node);
    }
  }
  function visit(record, index, animate = true) {
    $(`flight-${record.cityId}`).classList.add('arrived');
    const preview = $(`preview-${record.id}`); preview.classList.add('revealed'); preview.disabled = false;
    if (animate && !reduced()) preview.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 350 });
    if (index > 0 && chronological[index - 1].cityId !== record.cityId) {
      const from = position(chronological[index - 1]), to = position(record);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${from.x} ${from.y} L${to.x} ${to.y}`); path.setAttribute('pathLength', '1');
      if (!animate || reduced()) path.classList.add('no-animation');
      $('flight-routes').append(path);
    }
    arrived.add(record.id); $('flight-progress').textContent = `${index + 1} / ${chronological.length}`;
    $('flight-caption').textContent = `${record.city} · ${record.date}`;
  }
  function finish() {
    const last = position(chronological.at(-1));
    $('paper-plane').getAnimations().forEach(animation => animation.cancel());
    $('paper-plane').style.left = `${last.x}%`; $('paper-plane').style.top = `${last.y}%`;
    $('paper-plane').disabled = false; $('paper-plane').classList.add('landed');
    $('flight-caption').textContent = '还有一封，寄往11月2日。';
    $('flight-envelope').hidden = false; $('skip-flight').hidden = true; $('replay-flight').hidden = false;
  }
  async function pause(ms, signal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
  async function play() {
    if (!getState().archived || !canArrange(getState())) return;
    stop(); run = new AbortController(); const signal = run.signal; arrived = new Set();
    $('room').hidden = true; $('terminal').hidden = true; $('flight-scene').hidden = false;
    $('back-room').hidden = true; $('piece-tray').hidden = true;
    $('flight-title').textContent = '那些去过的现场'; drawStops();
    $('flight-envelope').hidden = true; $('skip-flight').hidden = false; $('replay-flight').hidden = true;
    $('paper-plane').disabled = true; $('paper-plane').classList.remove('landed');
    const first = position(chronological[0]); $('paper-plane').style.left = `${first.x}%`; $('paper-plane').style.top = `${first.y}%`;
    window.scrollTo(0, 0); $('flight-title').setAttribute('tabindex', '-1'); $('flight-title').focus({ preventScroll: true });
    try {
      for (const [index, record] of chronological.entries()) {
        if (signal.aborted) return;
        const target = position(record);
        if (index > 0 && chronological[index - 1].cityId !== record.cityId && !reduced()) {
          const from = position(chronological[index - 1]);
          $('paper-plane').animate([{ left: `${from.x}%`, top: `${from.y}%` }, { left: `${target.x}%`, top: `${target.y}%` }], { duration: 750, easing: 'ease-in-out' });
          await pause(750, signal);
        }
        $('paper-plane').style.left = `${target.x}%`; $('paper-plane').style.top = `${target.y}%`;
        visit(record, index, !reduced()); await pause(reduced() ? 0 : 850, signal);
      }
      finish();
    } catch (error) { if (error.name !== 'AbortError') { console.error(error); skip(); } }
  }
  function skip() {
    if (!getState().archived || $('flight-scene').hidden) return;
    stop(); drawStops(); chronological.forEach((record, index) => visit(record, index, false)); finish();
  }
  function leave() { stop(); $('flight-scene').hidden = true; showMap(); }
  $('arrange-journey').addEventListener('click', openSort);
  $('replay-journey').addEventListener('click', play);
  $('read-birthday').addEventListener('click', showLetter);
  $('leave-flight').addEventListener('click', leave);
  $('skip-flight').addEventListener('click', skip);
  $('replay-flight').addEventListener('click', play);
  $('flight-envelope').addEventListener('click', showLetter);
  $('paper-plane').addEventListener('click', showLetter);
  $('letter-album').addEventListener('click', () => {
    $('birthday-dialog').close(); stop(); $('flight-scene').hidden = true; goHome();
  });
  return { refresh, reset() { stop(); arrived.clear(); $('flight-scene').hidden = true; $('sort-dialog').close(); $('birthday-dialog').close(); refresh(); } };
}
