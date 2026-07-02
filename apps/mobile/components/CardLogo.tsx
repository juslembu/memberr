import Svg, { G, Rect } from 'react-native-svg'

interface Props {
  size?: number
  opacity?: number
}

// Inline SVG of the hand-drawn membership card mark.
// Uses the tight viewBox (68 76 466 348) so the card fills the frame.
// No displacement filter — at icon sizes it's imperceptible and RN SVG
// support for feTurbulence is limited.
export function CardLogo({ size = 24, opacity = 1 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="68 76 466 348" opacity={opacity}>
      <G transform="rotate(-8, 300, 248)">
        <Rect x={105} y={122} width={390} height={252} rx={44} fill="#f7f5f0" stroke="#0F172A" strokeWidth={11} strokeLinejoin="round" />
        <Rect x={113} y={202} width={374} height={40} fill="#0EA5E9" />
        <Rect x={136} y={141} width={58} height={44} rx={12} fill="#0EA5E9" stroke="#0F172A" strokeWidth={7} />
        <Rect x={156} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={172} y={268} width={16} height={62} fill="#0F172A" />
        <Rect x={196} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={216} y={268} width={12} height={62} fill="#0F172A" />
        <Rect x={236} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={252} y={268} width={16} height={62} fill="#0F172A" />
        <Rect x={280} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={296} y={268} width={12} height={62} fill="#0F172A" />
        <Rect x={316} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={332} y={268} width={16} height={62} fill="#0F172A" />
        <Rect x={356} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={376} y={268} width={12} height={62} fill="#0F172A" />
        <Rect x={396} y={268} width={8}  height={62} fill="#0F172A" />
        <Rect x={412} y={268} width={16} height={62} fill="#0F172A" />
        <Rect x={436} y={268} width={8}  height={62} fill="#0F172A" />
      </G>
    </Svg>
  )
}
