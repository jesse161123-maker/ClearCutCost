import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Share,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DollarSign,
  TrendingUp,
  FileX,
  AlertTriangle,
  Zap,
  CheckCircle,
  BarChart2,
  Share2,
  MessageSquare,
  Lightbulb,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { RiskBadge } from '@/components/RiskBadge';
import { SectionHeader } from '@/components/SectionHeader';
import { getAnalysis, Analysis, FindingCategory, RiskLevel } from '@/utils/api';
import { DOCUMENT_TYPE_LABELS } from '@/constants/DocumentTypes';

const FINDING_ICONS: Record<FindingCategory, React.ComponentType<{ size: number; color: string }>> = {
  hidden_fee: DollarSign,
  overpricing: TrendingUp,
  missing_scope: FileX,
  unusual_terms: AlertTriangle,
  financial_risk: Zap,
  positive_note: CheckCircle,
};

const SEVERITY_COLORS: Record<RiskLevel, { color: string; bg: string }> = {
  low: { color: COLORS.riskLow, bg: COLORS.riskLowBg },
  moderate: { color: COLORS.riskModerate, bg: COLORS.riskModerateBg },
  high: { color: COLORS.riskHigh, bg: COLORS.riskHighBg },
};

function extractExpectedPrice(text?: string | null): string | null {
  if (!text) return null;
  const expectedLineMatch = text.match(/Expected market (?:price|APR\/payment):\s*([^\n.]+)/i);

  if (expectedLineMatch) {
    if (/not enough detail/i.test(expectedLineMatch[1])) return null;
    return expectedLineMatch[1].trim();
  }

  const rangeMatch = text.match(/\$[\d,]+(?:\.\d{2})?\s*(?:-|to|–|—)\s*\$[\d,]+(?:\.\d{2})?/i);
  if (rangeMatch) return rangeMatch[0];
  const amountMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (!amountMatches || amountMatches.length === 0) return null;
  return amountMatches.slice(0, 2).join(amountMatches.length > 1 ? ' - ' : '');
}

function renderTextWithDollarHighlights(text: string) {
  const parts = text.split(/(\$[\d,]+(?:\.\d{2})?)/g);

  return parts.map((part, index) => {
    const isDollarAmount = /^\$[\d,]+(?:\.\d{2})?$/.test(part);

    return (
      <Text
        key={`${part}-${index}`}
        style={
          isDollarAmount
            ? {
                color: COLORS.riskLow,
                fontFamily: 'DMSans_700Bold',
                fontWeight: '700',
              }
            : undefined
        }
      >
        {part}
      </Text>
    );
  });
}

function AnimatedFindingCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: 200 + index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    console.log('[Analysis] Loading analysis:', id);
    setLoading(true);
    getAnalysis(id)
      .then((data) => {
        console.log('[Analysis] Loaded successfully:', data.id, 'risk:', data.risk_level);
        setAnalysis(data);
        const typeLabel = DOCUMENT_TYPE_LABELS[data.document_type] ?? data.document_type;
        navigation.setOptions({ title: typeLabel });
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      })
      .catch((err) => {
        console.error('[Analysis] Failed to load:', err);
        setError('Couldn\'t load this analysis. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!analysis) return;
    console.log('[Analysis] Share button pressed for:', analysis.id);
    const typeLabel = DOCUMENT_TYPE_LABELS[analysis.document_type] ?? analysis.document_type;
    const riskLabels: Record<RiskLevel, string> = {
      low: 'Low Concern',
      moderate: 'Moderate Concern',
      high: 'High Risk',
    };
    const riskLabel = riskLabels[analysis.risk_level] ?? analysis.risk_level;
    const shareText = [
      `ClearCutCost Analysis — ${typeLabel}`,
      `Risk Level: ${riskLabel}`,
      '',
      analysis.summary,
      '',
      'Key Findings:',
      ...analysis.key_findings.map((f) => `• ${f.title}: ${f.description}`),
      '',
      'Recommendations:',
      analysis.ai_recommendations,
    ].join('\n');

    try {
      await Share.share({ message: shareText });
    } catch (err) {
      console.warn('[Analysis] Share failed:', err);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleShare}
          style={{ padding: 8 }}
          accessibilityLabel="Share analysis"
        >
          <Share2 size={20} color={COLORS.primary} />
        </Pressable>
      ),
    });
  }, [analysis]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 14,
            color: COLORS.textSecondary,
            fontFamily: 'DMSans_400Regular',
          }}
        >
          Loading analysis...
        </Text>
      </View>
    );
  }

  if (error || !analysis) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            borderCurve: 'continuous',
            backgroundColor: COLORS.riskHighBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={28} color={COLORS.riskHigh} />
        </View>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: COLORS.text,
            fontFamily: 'DMSans_600SemiBold',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Couldn't load analysis
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            fontFamily: 'DMSans_400Regular',
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {error ?? 'Something went wrong. Please try again.'}
        </Text>
      </View>
    );
  }

  const riskConfig = SEVERITY_COLORS[analysis.risk_level] ?? SEVERITY_COLORS.moderate;
  const expectedPrice = extractExpectedPrice(analysis.market_comparison);

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background, opacity: fadeIn }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 40,
        gap: 28,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Overall Assessment Card */}
      <View
        style={{
          backgroundColor: riskConfig.bg,
          borderRadius: 20,
          borderCurve: 'continuous',
          padding: 20,
          borderWidth: 1,
          borderColor: `${riskConfig.color}20`,
          gap: 12,
        }}
      >
        <RiskBadge risk_level={analysis.risk_level} size="lg" />
        <Text
          style={{
            fontSize: 15,
            color: COLORS.text,
            lineHeight: 22,
            fontFamily: 'DMSans_400Regular',
          }}
        >
          {analysis.summary}
        </Text>
      </View>

      {/* Key Findings */}
      {analysis.key_findings.length > 0 && (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Key Findings" />
          <View style={{ gap: 10 }}>
            {analysis.key_findings.map((finding, index) => {
              const FindingIcon = FINDING_ICONS[finding.category] ?? AlertTriangle;
              const severityConfig = SEVERITY_COLORS[finding.severity] ?? SEVERITY_COLORS.moderate;
              return (
                <AnimatedFindingCard key={index} index={index}>
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      padding: 16,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      gap: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          borderCurve: 'continuous',
                          backgroundColor: severityConfig.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FindingIcon size={18} color={severityConfig.color} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '600',
                              color: COLORS.text,
                              fontFamily: 'DMSans_600SemiBold',
                              flex: 1,
                            }}
                            numberOfLines={2}
                          >
                            {finding.title}
                          </Text>
                          <View
                            style={{
                              backgroundColor: severityConfig.bg,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              borderCurve: 'continuous',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: severityConfig.color,
                                fontFamily: 'DMSans_600SemiBold',
                                textTransform: 'capitalize',
                              }}
                            >
                              {finding.severity}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            color: COLORS.textSecondary,
                            lineHeight: 20,
                            fontFamily: 'DMSans_400Regular',
                          }}
                        >
                          {finding.description}
                        </Text>
                      </View>
                    </View>
                  </View>
                </AnimatedFindingCard>
              );
            })}
          </View>
        </View>
      )}

      {/* AI Recommendations */}
      {analysis.ai_recommendations ? (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Recommendations" />
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <View
              style={{
                width: 3,
                borderRadius: 2,
                backgroundColor: COLORS.accent,
                alignSelf: 'stretch',
              }}
            />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={16} color={COLORS.accent} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: COLORS.accent,
                    fontFamily: 'DMSans_600SemiBold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  AI Recommendations
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.text,
                  lineHeight: 22,
                  fontFamily: 'DMSans_400Regular',
                }}
                selectable
              >
                {analysis.ai_recommendations}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Suggested Questions */}
      {analysis.suggested_questions.length > 0 && (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Questions to Ask" />
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MessageSquare size={16} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.primary,
                  fontFamily: 'DMSans_600SemiBold',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Ask Your Contractor / Provider
              </Text>
            </View>
            {analysis.suggested_questions.map((question, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: COLORS.primary,
                      fontFamily: 'DMSans_700Bold',
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: COLORS.text,
                    lineHeight: 20,
                    fontFamily: 'DMSans_400Regular',
                  }}
                  selectable
                >
                  {question}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Market Comparison */}
      {analysis.market_comparison ? (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Market Comparison" />
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={18} color={COLORS.accent} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: COLORS.accent,
                  fontFamily: 'DMSans_600SemiBold',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Market Context
              </Text>
            </View>
            {expectedPrice ? (
              <View
                style={{
                  backgroundColor: COLORS.riskLowBg,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  padding: 12,
                  borderWidth: 1,
                  borderColor: `${COLORS.riskLow}22`,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: COLORS.riskLow,
                    fontFamily: 'DMSans_600SemiBold',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Expected market price
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: COLORS.riskLow,
                    fontFamily: 'DMSans_700Bold',
                  }}
                >
                  {expectedPrice}
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                fontSize: 15,
                color: COLORS.text,
                lineHeight: 22,
                fontFamily: 'DMSans_400Regular',
              }}
              selectable
            >
              {renderTextWithDollarHighlights(analysis.market_comparison)}
            </Text>
          </View>
        </View>
      ) : null}
    </Animated.ScrollView>
  );
}
