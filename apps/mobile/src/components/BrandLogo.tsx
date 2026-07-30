import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette } from '../theme/tokens';

interface Props {
  size?: number;
}

/**
 * Campulator logosunun vektörel yaklaşık versiyonu: konum pini içinde yeşil çadır
 * ve hesap makinesi tuşları. Gerçek marka görselleri assets/brand/ altına
 * eklendiğinde bu bileşen görselle değiştirilebilir.
 */
export function BrandLogo({ size = 96 }: Props) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 100 125">
      {/* Pin gövdesi */}
      <Path
        d="M50 4C24 4 6 24 6 48c0 15 8 27 18 38l22 32a5 5 0 0 0 8 0l22-32c10-11 18-23 18-38C94 24 76 4 50 4Z"
        fill={palette.navy}
        stroke={palette.elevatedSurface}
        strokeWidth={3}
      />
      <Circle cx={50} cy={45} r={36} fill={palette.background} />
      {/* Çadır */}
      <Path d="M50 18 22 52h56L50 18Z" fill={palette.primary} />
      <Path d="M50 18 36 52h28L50 18Z" fill={palette.primaryBright} />
      <Path d="M50 30 42 52h16l-8-22Z" fill={palette.background} />
      {/* Hesap makinesi tuşları */}
      <Rect x={32} y={58} width={16} height={9} rx={2} fill={palette.textPrimary} />
      <Rect x={52} y={58} width={16} height={9} rx={2} fill={palette.textPrimary} />
      <Rect x={32} y={71} width={16} height={9} rx={2} fill={palette.textPrimary} />
      <Rect x={52} y={71} width={16} height={9} rx={2} fill={palette.textPrimary} />
    </Svg>
  );
}
