// ISO 3166-1 international countries list with dial codes, flags, examples, and masks
import flagUs from '../assets/login/flag-us-3310bc.png';
import countriesData from './countries.json';

export const COUNTRIES = countriesData.map((c, index) => ({
  ...c,
  flag: c.code === 'US' ? flagUs : c.flag,
  priority: index < 8 ? index + 1 : undefined,
}));

export const DEFAULT_COUNTRY = COUNTRIES[0]; // United States (+1)

export const findCountryByCode = (code) => {
  if (!code) return DEFAULT_COUNTRY;
  const upper = String(code).toUpperCase();
  return COUNTRIES.find((c) => c.code === upper) || DEFAULT_COUNTRY;
};

export const findCountryByDialCode = (dialCode) => {
  if (!dialCode) return DEFAULT_COUNTRY;
  const clean = String(dialCode).startsWith('+') ? String(dialCode) : `+${dialCode}`;
  return COUNTRIES.find((c) => c.dialCode === clean) || DEFAULT_COUNTRY;
};

export const extractCountryAndLocalNumber = (fullPhoneNumber) => {
  if (!fullPhoneNumber) return { country: DEFAULT_COUNTRY, localNumber: '' };
  const rawDigits = String(fullPhoneNumber).replace(/\D/g, '');

  const sortedCountries = [...COUNTRIES].sort((a, b) => {
    const aLen = a.dialCode.replace(/\D/g, '').length;
    const bLen = b.dialCode.replace(/\D/g, '').length;
    return bLen - aLen;
  });

  for (const country of sortedCountries) {
    const codeDigits = country.dialCode.replace(/\D/g, '');
    if (rawDigits.startsWith(codeDigits)) {
      return {
        country,
        localNumber: rawDigits.slice(codeDigits.length),
      };
    }
  }

  return { country: DEFAULT_COUNTRY, localNumber: rawDigits };
};

/**
 * Strictly format phone number according to country's official mask
 * Truncates any digits beyond the country's max digit limit.
 */
export const formatPhoneByCountry = (value, country = DEFAULT_COUNTRY) => {
  if (!value) return '';
  const rawDigits = String(value).replace(/\D/g, '');
  if (!rawDigits) return '';

  const countryObj = typeof country === 'string' ? findCountryByCode(country) : country || DEFAULT_COUNTRY;
  const mask = countryObj?.mask || '(###) ###-####';
  const maxDigits = (mask.match(/#/g) || []).length || 15;

  // Strictly truncate digits beyond maxDigits
  const trimmedDigits = rawDigits.slice(0, maxDigits);

  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < mask.length; i++) {
    if (digitIndex >= trimmedDigits.length) break;
    const maskChar = mask[i];
    if (maskChar === '#') {
      formatted += trimmedDigits[digitIndex];
      digitIndex++;
    } else {
      formatted += maskChar;
    }
  }

  // Trim trailing literal characters if no digit follows them
  formatted = formatted.replace(/[\s\-\.\(\)\/]+$/, '');
  return formatted || trimmedDigits;
};

export const getCountryPhonePlaceholder = (country = DEFAULT_COUNTRY) => {
  const countryObj = typeof country === 'string' ? findCountryByCode(country) : country || DEFAULT_COUNTRY;
  return countryObj?.example || '(123) 456-7890';
};

export const getCountryMaxDigits = (country = DEFAULT_COUNTRY) => {
  const countryObj = typeof country === 'string' ? findCountryByCode(country) : country || DEFAULT_COUNTRY;
  const mask = countryObj?.mask;
  if (mask) {
    const hashes = (mask.match(/#/g) || []).length;
    if (hashes > 0) return hashes;
  }
  return 10;
};

export const getCountryMaxFormattedLength = (country = DEFAULT_COUNTRY) => {
  const countryObj = typeof country === 'string' ? findCountryByCode(country) : country || DEFAULT_COUNTRY;
  return countryObj?.mask?.length || 15;
};
