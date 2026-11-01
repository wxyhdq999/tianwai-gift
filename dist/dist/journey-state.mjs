import { allRecords, orderedCorrectly } from './records.mjs';

export const chronological = [...allRecords].sort((a, b) => a.date.localeCompare(b.date));
export function validOrder(order) {
  return Array.isArray(order) && order.length === allRecords.length && new Set(order).size === allRecords.length && order.every(id => allRecords.some(record => record.id === id));
}
export function canArrange(state) {
  return allRecords.every(record => state.collected.includes(record.id));
}
export function confirmOrder(state, order) {
  if (!canArrange(state) || !orderedCorrectly(order)) return false;
  state.routeOrder = [...order]; state.archived = true;
  return true;
}
export const canOpenPackage = state => state.archived === true && state.letterOpened === true && canArrange(state);
