'use client';

import { useTranslations } from 'next-intl';
import type { FieldError } from 'react-hook-form';
import { ApiError } from './api';

/** Turns any thrown error into a translated, user-facing sentence. */
export function useErrorMessage() {
  const t = useTranslations('errors');
  return (error: unknown): string => {
    const code = error instanceof ApiError ? error.code : 'generic';
    return t.has(code as 'generic') ? t(code as 'generic') : t('generic');
  };
}

/** Translates a react-hook-form error produced by a zod schema. */
export function useFieldError() {
  const t = useTranslations('errors.field');
  return (error: FieldError | undefined, kind?: 'email' | 'phone' | 'code'): string | undefined => {
    if (!error) return undefined;
    if (error.type === 'server') return error.message;
    if (
      kind &&
      (error.type === 'invalid_format' || error.type === 'too_small' || error.type === 'too_big')
    ) {
      return t(kind);
    }
    const minimum = /(\d+)/.exec(error.message ?? '')?.[1];
    switch (error.type) {
      case 'too_small':
        return minimum && minimum !== '1' ? t('tooShort', { min: minimum }) : t('required');
      case 'too_big':
        return t('tooLong', { max: minimum ?? '' });
      case 'invalid_type':
      case 'invalid_value':
        return t('required');
      default:
        return t('invalid');
    }
  };
}
