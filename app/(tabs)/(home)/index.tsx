import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  Stethoscope,
  FileSignature,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnalysisCard } from '@/components/AnalysisCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { SectionHeader } from '@/components/SectionHeader';
import { listAnalyses, getUsage, AnalysisSummary, UsageInfo } from '@/utils/api';
import { getFreeAnalysisUsage, hasFreeAnalysesRemaining } from '@/utils/freeAnalysisUsage';
import { getSessionId } from '@/utils/session';
import { useSubscription } from '@/contexts/SubscriptionContext';

const INSIGHT_CARDS = [
  {
    icon: FileText,
    title: 'Contractor Estimates',
    description: 'Spot overcharging and missing scope',
    color: COLORS.primary,
    bg: COLORS.primaryMuted,
  },
  {
    icon: Stethoscope,
    title: 'Medical Bills',
    description: 'Find billing errors and unusual charges',
    color: COLORS.accent,
    bg: COLORS.accentMuted,
  },
  {
    icon: FileSignature,
    title: 'Contracts & Legal',
    description: 'Understand terms before you sign',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: Shield,
    title: 'Insurance Letters',
    description: 'Decode complex policy language',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
  },
];

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 70,
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSubscribed, checkSubscription } = useSubscription();

  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(heroTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    console.log('[Home] Loading dashboard data');
    setLoading(true);
    try {
      const sessionId = await getSessionId();
      const [analysisData, usageData] = await Promise.all([
        listAnalyses(sessionId).catch((e) => { console.warn('[Home] Failed to load analyses:', e); return []; }),
        getUsage(sessionId).catch((e) => { console.warn('[Home] Failed to load usage:', e); return null; }),
      ]);
      const safeAnalyses = Array.isArray(analysisData) ? analysisData : [];
      const localUsage = await getFreeAnalysisUsage();
      setAnalyses(safeAnalyses.slice(0, 3));
      setUsage({
        used: Math.max(usageData?.used ?? 0, localUsage.used),
        analyses_used: Math.max(usageData?.analyses_used ?? 0, localUsage.used),
        limit: usageData?.limit ?? localUsage.limit,
        is_pro: usageData?.is_pro ?? false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAnalyzePress = async () => {
    console.log('[Home] Analyze button pressed');
    const hasActiveSubscription = isSubscribed || (await checkSubscription());

    if (!hasActiveSubscription) {
      const canUseFreeAnalysis = await hasFreeAnalysesRemaining();

      if (!canUseFreeAnalysis) {
        router.push('/paywall');
        return;
      }
    }

    router.push('/upload');
  };

  const handleViewAll = () => {
    console.log('[Home] View all pressed');
    router.push('/(tabs)/history');
  };

  const usedCount = usage?.used ?? 0;
  const limitCount = usage?.limit ?? 3;
  const usageText = isSubscribed ? 'Pro — Unlimited analyses' : `${usedCount} of ${limitCount} free analyses used this month`;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 120,
        gap: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <Animated.View
        style={{
          opacity: heroOpacity,
          transform: [{ translateY: heroTranslate }],
          gap: 20,
        }}
      >
        <View style={{ gap: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 8,
                borderCurve: 'continuous',
                paddingHorizontal: 10,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Sparkles size={12} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: COLORS.primary,
                  fontFamily: 'DMSans_600SemiBold',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                AI-Powered Analysis
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              letterSpacing: -0.5,
              lineHeight: 36,
            }}
          >
            Understand expensive decisions before they cost you.
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.textSecondary,
              lineHeight: 22,
              fontFamily: 'DMSans_400Regular',
              marginTop: 8,
            }}
          >
            AI-powered analysis for quotes, contracts, bills, and financial documents.
          </Text>
        </View>

        <AnimatedPressable
          onPress={handleAnalyzePress}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            borderCurve: 'continuous',
            paddingVertical: 16,
            paddingHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: COLORS.white,
              fontFamily: 'DMSans_600SemiBold',
            }}
          >
            Analyze a Document
          </Text>
          <ArrowRight size={18} color={COLORS.white} />
        </AnimatedPressable>

        {/* Usage indicator */}
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 12,
              color: isSubscribed ? COLORS.riskLow : COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            {usageText}
          </Text>
        </View>
      </Animated.View>

      {/* Recent Analyses */}
      <View style={{ gap: 16 }}>
        <SectionHeader
          title="Recent Analyses"
          action={
            analyses.length > 0 ? (
              <Pressable onPress={handleViewAll}>
                <Text
                  style={{
                    fontSize: 14,
                    color: COLORS.primary,
                    fontFamily: 'DMSans_500Medium',
                    fontWeight: '500',
                  }}
                >
                  View all
                </Text>
              </Pressable>
            ) : undefined
          }
        />

        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : analyses.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={24} color={COLORS.primary} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.text,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              No analyses yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
                fontFamily: 'DMSans_400Regular',
                maxWidth: 260,
              }}
            >
              Analyze your first document to get AI-powered insights and risk assessment.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {analyses.map((analysis, index) => (
              <AnimatedListItem key={analysis.id} index={index}>
                <AnalysisCard analysis={analysis} />
              </AnimatedListItem>
            ))}
          </View>
        )}
      </View>

      {/* Smart Insights */}
      <View style={{ gap: 16 }}>
        <SectionHeader title="What We Analyze" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 4 }}
        >
          {INSIGHT_CARDS.map((card, index) => {
            const CardIcon = card.icon;
            return (
              <AnimatedListItem key={card.title} index={index}>
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    padding: 16,
                    width: 160,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    gap: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      backgroundColor: card.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CardIcon size={20} color={card.color} />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: COLORS.text,
                        fontFamily: 'DMSans_600SemiBold',
                        lineHeight: 18,
                      }}
                    >
                      {card.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textSecondary,
                        lineHeight: 16,
                        fontFamily: 'DMSans_400Regular',
                      }}
                    >
                      {card.description}
                    </Text>
                  </View>
                </View>
              </AnimatedListItem>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
