import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

type RiskLevel = 'low' | 'moderate' | 'high';

interface RiskBadgeProps {
  risk_level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const CONFIG = {
  low: {
    label: 'Within Market',
    color: COLORS.riskLow,
    bg: COLORS.riskLowBg,
    Icon: CheckCircle,
  },
  moderate: {
    label: 'Moderately Within Market',
    color: COLORS.riskModerate,
    bg: COLORS.riskModerateBg,
    Icon: AlertTriangle,
  },
  high: {
    label: 'Over Market',
    color: COLORS.riskHigh,
    bg: COLORS.riskHighBg,
    Icon: AlertOctagon,
  },
};

export function RiskBadge({ risk_level, size = 'md' }: RiskBadgeProps) {
  const level = (risk_level as RiskLevel) in CONFIG ? (risk_level as RiskLevel) : 'moderate';
  const config = CONFIG[level];
  const { Icon } = config;

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  const paddingH = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;
  const paddingV = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: config.bg,
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        borderRadius: 8,
        borderCurve: 'continuous',
        alignSelf: 'flex-start',
      }}
    >
      <Icon size={iconSize} color={config.color} strokeWidth={2} />
      <Text
        style={{
          fontSize,
          fontWeight: '600',
          color: config.color,
          fontFamily: 'DMSans_600SemiBold',
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
