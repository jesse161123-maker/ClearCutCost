import React from 'react';
import { View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Link } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RiskBadge } from '@/components/RiskBadge';
import { COLORS } from '@/constants/Colors';
import { AnalysisSummary } from '@/utils/api';
import { DOCUMENT_TYPE_LABELS } from '@/constants/DocumentTypes';

interface AnalysisCardProps {
  analysis: AnalysisSummary;
  index?: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffDays < 2) return 'Yesterday';
  if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const typeLabel = DOCUMENT_TYPE_LABELS[analysis.document_type] ?? analysis.document_type;
  const dateDisplay = formatDate(analysis.created_at);
  const summarySnippet = analysis.summary.length > 100
    ? analysis.summary.slice(0, 100) + '…'
    : analysis.summary;

  return (
    <Link href={`/analysis/${analysis.id}`} asChild>
      <AnimatedPressable
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: COLORS.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {typeLabel}
            </Text>
            <RiskBadge risk_level={analysis.risk_level as 'low' | 'moderate' | 'high'} size="sm" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
              {dateDisplay}
            </Text>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </View>
        </View>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            lineHeight: 20,
            fontFamily: 'DMSans_400Regular',
          }}
          numberOfLines={2}
        >
          {summarySnippet}
        </Text>
      </AnimatedPressable>
    </Link>
  );
}
