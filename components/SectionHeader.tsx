import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.text,
          fontFamily: 'DMSans_600SemiBold',
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
