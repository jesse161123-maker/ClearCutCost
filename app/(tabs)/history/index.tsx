import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, FileText } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnalysisCard } from '@/components/AnalysisCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { listAnalyses, AnalysisSummary } from '@/utils/api';
import { hasFreeAnalysesRemaining } from '@/utils/freeAnalysisUsage';
import { getSessionId } from '@/utils/session';
import { useSubscription } from '@/contexts/SubscriptionContext';

function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSubscribed, checkSubscription } = useSubscription();

  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyses = useCallback(async () => {
    console.log('[History] Loading analyses');
    setLoading(true);
    setError(null);
    try {
      const sessionId = await getSessionId();
      const data = await listAnalyses(sessionId);
      console.log('[History] Loaded', data.length, 'analyses');
      setAnalyses(data);
    } catch (err) {
      console.error('[History] Failed to load analyses:', err);
      setError('Couldn\'t load your history. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [loadAnalyses])
  );

  const handleAnalyzePress = async () => {
    console.log('[History] Analyze first document pressed');
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

  const renderItem = ({ item, index }: { item: AnalysisSummary; index: number }) => (
    <AnimatedItem index={index}>
      <AnalysisCard analysis={item} />
    </AnimatedItem>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.divider,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Clock size={22} color={COLORS.primary} />
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: COLORS.text,
            fontFamily: 'DMSans_700Bold',
            letterSpacing: -0.3,
          }}
        >
          History
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' }}>
            Couldn't load history
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={loadAnalyses}
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingVertical: 12,
              paddingHorizontal: 20,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
              Try again
            </Text>
          </AnimatedPressable>
        </View>
      ) : analyses.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              borderCurve: 'continuous',
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={32} color={COLORS.primary} />
          </View>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 18,
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
                fontFamily: 'DMSans_400Regular',
                textAlign: 'center',
                lineHeight: 20,
                maxWidth: 260,
              }}
            >
              Your analyzed documents will appear here for quick reference.
            </Text>
          </View>
          <AnimatedPressable
            onPress={handleAnalyzePress}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              borderCurve: 'continuous',
              paddingVertical: 14,
              paddingHorizontal: 24,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: COLORS.white,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Analyze your first document
            </Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 120,
            gap: 12,
          }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
