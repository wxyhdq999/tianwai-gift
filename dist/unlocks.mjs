import { allRecords } from './records.mjs';

export const gates = {
  'changzhou:2023.10.21': { type: 'puzzle' },
  'nanjing:2026.05.29': { type: 'puzzle' },
  'zunyi:2023.08.26': {
    type: 'quiz', question: '薛之谦通过哪个选秀节目出道？', answers: ['我型我秀', '我型我show'],
    placeholder: '输入节目名', hint: '节目名是四个字，开头是“我”。', reveal: '我型我秀。',
    source: { title: '题目和答案由送礼人提供' },
  },
  'shenzhen:2026.08.29': {
    type: 'quiz', question: '《念》这首单曲的 MV 是薛之谦花了多少天亲手剪辑的？', answers: ['11', '11天', '十一', '十一天'],
    placeholder: '输入天数', hint: '比十天多一天。', reveal: '11天。',
    source: { title: '题目和答案由送礼人提供' },
  },
  'shenzhen:2026.08.30': {
    type: 'quiz', question: '我崇拜~', answers: ['你回眸一笑就爱恨重来'],
    placeholder: '接下一句', hint: '从“你回眸”开始。', reveal: '你回眸一笑就爱恨重来',
    source: { title: '题目和答案由送礼人提供' },
  },
  'guiyang:2026.10.24': {
    type: 'quiz', question: '《动物世界》收录在哪张专辑？', answers: ['渡', '渡thecrossing', 'thecrossing'],
    placeholder: '输入专辑名', hint: '专辑名只有一个字。', reveal: '《渡》。',
    source: { title: '薛之謙 · 渡', url: 'https://lnk.to/JokerXue_TheCrossing' },
  },
  'guiyang:2026.10.25': {
    type: 'quiz', question: '专辑《尘》发行于哪一年？', answers: ['2019'],
    placeholder: '输入年份', hint: '在《怪咖》之后、《天外来物》之前。', reveal: '2019年。',
    source: { title: 'AWA · 尘', url: 'https://s.awa.fm/album/f9c4e6e20cbcb5b17556' },
  },
};
export function getGate(recordId) { return gates[recordId] || { type: 'date' }; }
export const puzzleRecords = allRecords.filter(record => getGate(record.id).type === 'puzzle');
export function normalizeDate(value) {
  const input = String(value).normalize('NFKC').trim();
  let parts;
  if (/^\d{8}$/.test(input)) parts = [input.slice(0, 4), input.slice(4, 6), input.slice(6)];
  else if (/^\d{6}$/.test(input)) parts = ['20' + input.slice(0, 2), input.slice(2, 4), input.slice(4)];
  else {
    const match = input.match(/^(\d{2}|\d{4})[年./\-\s]+(\d{1,2})[月./\-\s]+(\d{1,2})日?$/);
    if (!match) return null;
    parts = [match[1].length === 2 ? '20' + match[1] : match[1], match[2], match[3]];
  }
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}
export function normalizeAnswer(value) {
  return String(value).normalize('NFKC').toLowerCase().trim().replace(/[《》〈〉「」『』，。！？、,.!?~～\s]/g, '').replace(/年$/, '');
}
export function checkAnswer(recordId, value) {
  const record = allRecords.find(record => record.id === recordId);
  if (!record) return false;
  const gate = getGate(recordId);
  if (gate.type === 'date') return normalizeDate(value) === record.date;
  if (gate.type === 'quiz') return gate.answers.includes(normalizeAnswer(value));
  return false;
}
