/** Accept list that keeps validation types while enabling mobile camera in the native picker. */
export const IMAGE_FILE_ACCEPT =
  'image/*,image/jpeg,image/png,image/heif,image/heic,image/webp,.jpg,.jpeg,.png,.heif,.heic,.webp';

export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
