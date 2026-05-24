import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown,
  CheckCircle,
  Shield,
  FileText,
  Trash2,
  ChevronRight,
  Settings,
  Info,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SectionHeader } from '@/components/SectionHeader';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { clearSession } from '@/utils/session';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingsRow({ icon, label, value, onPress, destructive, showChevron = true }: SettingsRowProps) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          borderCurve: 'continuous',
          backgroundColor: destructive ? COLORS.riskHighBg : COLORS.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: destructive ? COLORS.riskHigh : COLORS.text,
          fontFamily: 'DMSans_400Regular',
        }}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            fontFamily: 'DMSans_400Regular',
          }}
        >
          {value}
        </Text>
      )}
      {showChevron && onPress && (
        <ChevronRight size={16} color={COLORS.textTertiary} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress}>
        {content}
      </AnimatedPressable>
    );
  }
  return content;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSubscribed } = useSubscription();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleUpgradePress = () => {
    console.log('[Settings] Upgrade to Pro pressed');
    router.push('/paywall');
  };

  const handlePrivacyPress = () => {
    console.log('[Settings] Privacy Policy pressed');
  };

  const handleTermsPress = () => {
    console.log('[Settings] Terms of Service pressed');
  };

  const handleClearHistory = () => {
    console.log('[Settings] Clear History pressed');
    Alert.alert(
      'Clear History',
      'This will remove your session data and all local analysis history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Confirming clear history');
            try {
              await clearSession();
              await AsyncStorage.multiRemove(['clearcutcost_session_id']);
              Alert.alert('Done', 'Your history has been cleared.');
            } catch (err) {
              console.error('[Settings] Failed to clear history:', err);
              Alert.alert('Error', 'Couldn\'t clear history. Try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 120,
        gap: 28,
      }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
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
        <Settings size={22} color={COLORS.primary} />
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: COLORS.text,
            fontFamily: 'DMSans_700Bold',
            letterSpacing: -0.3,
          }}
        >
          Settings
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 28 }}>
        {/* Subscription Section */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Subscription" />
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {isSubscribed ? (
              <View style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      backgroundColor: COLORS.riskLowBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Crown size={20} color={COLORS.riskLow} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: COLORS.text,
                        fontFamily: 'DMSans_600SemiBold',
                      }}
                    >
                      Pro Plan
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.textSecondary,
                        fontFamily: 'DMSans_400Regular',
                      }}
                    >
                      Unlimited analyses
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: COLORS.riskLowBg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderCurve: 'continuous',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle size={12} color={COLORS.riskLow} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: COLORS.riskLow,
                        fontFamily: 'DMSans_600SemiBold',
                      }}
                    >
                      Active
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ padding: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Crown size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: COLORS.text,
                        fontFamily: 'DMSans_600SemiBold',
                      }}
                    >
                      Free Plan
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.textSecondary,
                        fontFamily: 'DMSans_400Regular',
                      }}
                    >
                      3 analyses per month
                    </Text>
                  </View>
                </View>
                <AnimatedPressable
                  onPress={handleUpgradePress}
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    paddingVertical: 13,
                    alignItems: 'center',
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
                    Upgrade to Pro
                  </Text>
                </AnimatedPressable>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="About" />
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SettingsRow
              icon={<Info size={16} color={COLORS.primary} />}
              label="App Version"
              value={appVersion}
              showChevron={false}
            />
            <View style={{ height: 1, backgroundColor: COLORS.divider, marginLeft: 60 }} />
            <SettingsRow
              icon={<Shield size={16} color={COLORS.primary} />}
              label="Privacy Policy"
              onPress={handlePrivacyPress}
            />
            <View style={{ height: 1, backgroundColor: COLORS.divider, marginLeft: 60 }} />
            <SettingsRow
              icon={<FileText size={16} color={COLORS.primary} />}
              label="Terms of Service"
              onPress={handleTermsPress}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Data" />
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SettingsRow
              icon={<Trash2 size={16} color={COLORS.riskHigh} />}
              label="Clear History"
              onPress={handleClearHistory}
              destructive
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
