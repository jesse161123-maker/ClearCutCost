import React from 'react';
import { Text } from 'react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';

interface DocumentTypeChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function DocumentTypeChip({ label, selected, onPress }: DocumentTypeChipProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: selected ? COLORS.primary : COLORS.surfaceSecondary,
        borderWidth: 1,
        borderColor: selected ? COLORS.primary : COLORS.border,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: selected ? COLORS.white : COLORS.text,
          fontFamily: selected ? 'DMSans_500Medium' : 'DMSans_400Regular',
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
