import { useEffect, useState } from 'react';
import { readDraft, persistDraft } from '../utils/drafts';

export const useDraftState = (
  draftKey: string,
  initialValue = '',
): [string, (value: string) => void] => {
  const [value, setValue] = useState<string>(() => readDraft(draftKey) || initialValue);

  useEffect(() => {
    persistDraft(draftKey, value);
  }, [draftKey, value]);

  return [value, setValue];
};
