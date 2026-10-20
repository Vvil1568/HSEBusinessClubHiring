import { formatFileSize } from '../../../utils/drafts';

export interface FileSizeLabelProps {
  size: number;
}

export const FileSizeLabel = ({ size }: FileSizeLabelProps) => (
  <span style={{ color: 'inherit', fontSize: 12, opacity: 0.75 }}>{formatFileSize(size)}</span>
);
