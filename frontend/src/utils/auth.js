export function normalizeMobileInput(value) {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 12);
}

export function authErrorMessage(error, t) {
  const key = `auth.errors.${error?.code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return error?.message || t('common.errorGeneric');
}
