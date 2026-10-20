const encodeSvg = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const buildLogoDataUri = (label: string, from: string, to: string): string =>
  encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="64" height="64" rx="18" fill="url(#g)"/>` +
      `<text x="32" y="42" font-family="Inter, Segoe UI, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>` +
      `</svg>`,
  );

export const buildAvatarDataUri = (label: string, from: string, to: string): string =>
  encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<circle cx="32" cy="32" r="32" fill="url(#a)"/>` +
      `<text x="32" y="41" font-family="Inter, Segoe UI, sans-serif" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle">${label}</text>` +
      `</svg>`,
  );
