import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { palette } from '../../theme/tokens';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}

export const SearchBar = ({ value, onChange, placeholder, ariaLabel }: SearchBarProps) => (
  <Input
    allowClear
    size="large"
    aria-label={ariaLabel}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    prefix={<SearchOutlined style={{ color: palette.textMuted }} />}
    style={{
      borderRadius: 14,
      background: palette.surfaceMuted,
      borderColor: palette.border,
      width: '100%',
    }}
  />
);
