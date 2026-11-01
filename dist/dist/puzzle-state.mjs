import { allRecords, cleanProgress } from './records.mjs';
import { getGate, checkAnswer } from './unlocks.mjs';
import { canArrange, validOrder } from './journey-state.mjs';
import { orderedCorrectly } from './records.mjs';

export const missingSlots = [1, 2];
export const pieceId = (recordId, slot) => `${recordId}#${slot}`;
export const getRecord = id => allRecords.find(record => record.id === id);
export function decodePiece(id) {
  if (typeof id !== 'string') return null;
  const split = id.lastIndexOf('#');
  const recordId = id.slice(0, split), slot = Number(id.slice(split + 1));
  return getRecord(recordId) && getGate(recordId).type === 'puzzle' && missingSlots.includes(slot) ? { recordId, slot } : null;
}
export function isSolved(state, recordId) {
  return !!getRecord(recordId) && getGate(recordId).type === 'puzzle' && missingSlots.every(slot => {
    const piece = pieceId(recordId, slot);
    return state.pieces.includes(piece) && state.placements[recordId]?.[slot] === piece;
  });
}
export function cleanState(raw) {
  const state = { pieces: [], placements: {}, unlocked: [], collected: [], routeOrder: [], archived: false, letterOpened: false, packageOpened: false };
  if (!raw || typeof raw !== 'object') return state;
  state.unlocked = cleanProgress(raw.unlocked).filter(id => getGate(id).type !== 'puzzle');
  // Preserve a previously completed puzzle when that show changes to a date or quiz gate.
  for (const record of allRecords) {
    if (getGate(record.id).type === 'puzzle') continue;
    if (missingSlots.every(slot => Array.isArray(raw.pieces) && raw.pieces.includes(pieceId(record.id, slot)) && raw.placements?.[record.id]?.[slot] === pieceId(record.id, slot))) state.unlocked.push(record.id);
  }
  state.unlocked = [...new Set(state.unlocked)];
  state.pieces = [...new Set(Array.isArray(raw.pieces) ? raw.pieces.filter(id => decodePiece(id)) : [])];
  const used = new Set();
  for (const record of allRecords) {
    state.placements[record.id] = {};
    if (getGate(record.id).type !== 'puzzle') continue;
    for (const slot of missingSlots) {
      const piece = raw.placements?.[record.id]?.[slot];
      if (state.pieces.includes(piece) && !used.has(piece)) {
        state.placements[record.id][slot] = piece; used.add(piece);
      }
    }
  }
  state.collected = cleanProgress(raw.collected).filter(id => isUnlocked(state, id));
  state.routeOrder = validOrder(raw.routeOrder) ? [...raw.routeOrder] : [];
  state.archived = raw.archived === true && canArrange(state) && orderedCorrectly(state.routeOrder);
  state.letterOpened = state.archived && raw.letterOpened === true;
  state.packageOpened = state.letterOpened && raw.packageOpened === true;
  return state;
}
export function placePiece(state, recordId, slot, piece) {
  if (!getRecord(recordId) || getGate(recordId).type !== 'puzzle' || !missingSlots.includes(slot) || !state.pieces.includes(piece) || isSolved(state, recordId)) return false;
  for (const [id, positions] of Object.entries(state.placements)) {
    if (isSolved(state, id) && Object.values(positions).includes(piece)) return false;
  }
  for (const positions of Object.values(state.placements)) {
    for (const key of Object.keys(positions)) if (positions[key] === piece) delete positions[key];
  }
  state.placements[recordId] ??= {};
  state.placements[recordId][slot] = piece;
  return true;
}
export function removePiece(state, recordId, slot) {
  if (!getRecord(recordId) || getGate(recordId).type !== 'puzzle' || !missingSlots.includes(slot) || isSolved(state, recordId)) return false;
  delete (state.placements[recordId] ?? {})[slot];
  return true;
}
export function isUnlocked(state, recordId) {
  if (!getRecord(recordId)) return false;
  return getGate(recordId).type === 'puzzle' ? isSolved(state, recordId) : (state.unlocked || []).includes(recordId);
}
export function unlockAnswer(state, recordId, value) {
  if (!checkAnswer(recordId, value)) return false;
  if (!state.unlocked.includes(recordId)) state.unlocked.push(recordId);
  return true;
}
