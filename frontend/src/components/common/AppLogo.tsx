import { Link } from 'react-router-dom';
import { palette } from '../../theme/tokens';

const LOGO_URL = '/businessclub_logo.svg';
const LOGO_ASPECT_RATIO = 37 / 64;

interface AppLogoProps {
  height?: number;
}

export const AppLogo = ({ height = 34 }: AppLogoProps) => {
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  return (
    <Link
      to="/startup"
      aria-label="Бизнес-клуб — на главную"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
      }}
    >
      <img
        src={LOGO_URL}
        alt="Бизнес-клуб"
        width={width}
        height={height}
        style={{ display: 'block', flexShrink: 0 }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span
          style={{
            color: palette.text,
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
          }}
        >
          Бизнес-клуб
        </span>
        <span
          style={{
            color: palette.textSecondary,
            fontSize: 10.5,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          СТАРТАПЫ И ВАКАНСИИ
        </span>
      </span>
    </Link>
  );
};
