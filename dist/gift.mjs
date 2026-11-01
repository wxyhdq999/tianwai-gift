import { birthday } from './birthday.mjs?v=sword-gift-1';
import { canOpenPackage } from './journey-state.mjs';

export function createGift({ getState, save }) {
  const $ = id => document.getElementById(id);
  let timer;
  function reveal() {
    $('sealed-gift').hidden = true; $('gift-content').hidden = false;
    $('gift-photo').hidden = !birthday.giftImage;
    $('gift-placeholder').hidden = !!birthday.giftImage;
    $('gift-caption').textContent = birthday.giftCaption;
    $('gift-image-error').hidden = true;
    if (birthday.giftImage) {
      $('gift-photo').onerror = () => { $('gift-photo').hidden = true; $('gift-image-error').hidden = false; };
      $('gift-photo').src = birthday.giftImage;
    }
  }
  function open() {
    if (!canOpenPackage(getState())) return;
    clearTimeout(timer); $('sealed-gift').classList.remove('unsealing');
    $('gift-content').hidden = true; $('sealed-gift').hidden = false; $('unwrap-gift').disabled = false;
    if (getState().packageOpened) reveal();
    $('gift-dialog').showModal();
  }
  $('unwrap-gift').addEventListener('click', () => {
    if (!canOpenPackage(getState())) return;
    getState().packageOpened = true; save(); $('unwrap-gift').disabled = true;
    $('sealed-gift').classList.add('unsealing');
    timer = setTimeout(reveal, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500);
  });
  $('gift-dialog').addEventListener('close', () => clearTimeout(timer));
  return { open };
}
