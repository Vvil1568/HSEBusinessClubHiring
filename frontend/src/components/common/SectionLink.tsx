import { Link } from 'react-router-dom';
import { palette } from '../../theme/tokens';

interface SectionLinkProps {
  label: string;
  to: string;
}

export const SectionLink = ({ label, to }: SectionLinkProps) => (
  <Link
    to={to}
    style={{
      color: palette.primaryHover,
      fontSize: 13,
      fontWeight: 600,
      textDecoration: 'underline',
      textUnderlineOffset: 4,
    }}
  >
    {label}
  </Link>
);
