import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { DocumentTypeChip } from '@/components/DocumentTypeChip';
import { createAnalysis, DocumentType } from '@/utils/api';
import { hasFreeAnalysesRemaining, recordFreeAnalysisUsed } from '@/utils/freeAnalysisUsage';
import { getSessionId } from '@/utils/session';
import { DOCUMENT_TYPE_OPTIONS } from '@/constants/DocumentTypes';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function UploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSubscribed, checkSubscription } = useSubscription();

  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'pdf' | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [selectedFileMimeType, setSelectedFileMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = documentText.length;
  const hasImportedFile = selectedFileName !== null;
  const canAnalyze = selectedType !== null && (documentText.trim().length > 0 || hasImportedFile) && !loading;

  const buildImportedFilePrompt = () => {
    if (!selectedFileName || !selectedFileType) {
      return '';
    }

    if (selectedFileType === 'image') {
      return [
        `Imported image: ${selectedFileName}`,
        '',
        'Analyze this uploaded image. Identify visible costs, line items, totals, payment terms, fees, missing scope, unusual clauses, and risk factors. If exact text is unclear, state what needs manual confirmation.',
      ].join('\n');
    }

    return [
      `Imported PDF: ${selectedFileName}`,
      '',
      'Analyze this uploaded PDF document. Identify costs, fees, totals, payment terms, missing scope, unusual clauses, and risk factors. If the PDF text is not available in this temporary build, state what key pages or line items should be confirmed.',
    ].join('\n');
  };

  const handleClose = () => {
    console.log('[Upload] Close button pressed');
    router.back();
  };

  const handleTypeSelect = (type: DocumentType) => {
    console.log('[Upload] Document type selected:', type);
    setSelectedType(type);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!canAnalyze || !selectedType) return;
    const userText = documentText.trim();
    const analysisText = userText || buildImportedFilePrompt();

    if (!analysisText) return;

    console.log('[Upload] Analyze button pressed, type:', selectedType, 'text length:', analysisText.length);
    setLoading(true);
    setError(null);

    try {
      const hasActiveSubscription = isSubscribed || (await checkSubscription());

      if (!hasActiveSubscription) {
        const canUseFreeAnalysis = await hasFreeAnalysesRemaining();

        if (!canUseFreeAnalysis) {
          router.replace('/paywall');
          return;
        }
      }

      const sessionId = await getSessionId();
      const analysis = await createAnalysis({
        session_id: sessionId,
        document_type: selectedType,
        document_text: analysisText,
        is_subscribed: hasActiveSubscription,
        document_file:
          selectedFileName && selectedFileBase64 && selectedFileMimeType
            ? {
                name: selectedFileName,
                mime_type: selectedFileMimeType,
                base64: selectedFileBase64,
              }
            : null,
      });
      if (!hasActiveSubscription) {
        await recordFreeAnalysisUsed();
      }
      console.log('[Upload] Analysis created successfully, id:', analysis.id);
      router.replace(`/analysis/${analysis.id}`);
    } catch (err: any) {
      console.error('[Upload] Analysis failed:', err);
      if (err?.status === 429) {
        router.replace('/paywall');
      } else {
        setError(err?.message ?? 'Couldn\'t analyze your document. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Photo library access is needed to upload a PNG or photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        base64: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName ?? 'Selected photo';
      const mimeType = asset.mimeType ?? mimeTypeFromFileName(fileName, 'image/jpeg');

      setSelectedFileName(fileName);
      setSelectedImageUri(asset.uri);
      setSelectedFileType('image');
      setSelectedFileBase64(asset.base64 ?? null);
      setSelectedFileMimeType(mimeType);
      setDocumentText([
        `Imported image: ${fileName}`,
        '',
        'Describe the visible costs, line items, totals, terms, and risk factors from this uploaded image. If text is unclear, call out what needs manual confirmation.',
      ].join('\n'));
    } catch (err: any) {
      console.error('[Upload] Image import failed:', err);
      setError(err?.message ?? 'Couldn\'t import that image. Try another file.');
    }
  };

  const handlePickPdf = async () => {
    setError(null);

    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.name || 'Selected PDF';
      const base64 = await uriToBase64(asset.uri);

      setSelectedFileName(fileName);
      setSelectedImageUri(null);
      setSelectedFileType('pdf');
      setSelectedFileBase64(base64);
      setSelectedFileMimeType(asset.mimeType ?? 'application/pdf');
      setDocumentText([
        `Imported PDF: ${fileName}`,
        '',
        'Analyze this uploaded PDF document. Identify costs, fees, totals, payment terms, missing scope, unusual clauses, and risk factors. If the PDF text is not available in this temporary build, state what key pages or line items should be confirmed.',
      ].join('\n'));
    } catch (err: any) {
      console.error('[Upload] PDF import failed:', err);
      setError(err?.message ?? 'Couldn\'t import that PDF. Try another file.');
    }
  };

  const uriToBase64 = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.onloadend = () => {
        const result = String(reader.result || '');
        const [, base64 = ''] = result.split(',');

        if (!base64) {
          reject(new Error('Could not read the selected file.'));
          return;
        }

        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  const mimeTypeFromFileName = (fileName: string, fallback: string) => {
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.png')) return 'image/png';
    if (lowerName.endsWith('.webp')) return 'image/webp';
    if (lowerName.endsWith('.gif')) return 'image/gif';
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';

    return fallback;
  };

  const handleUpgradePress = () => {
    console.log('[Upload] Upgrade to Pro pressed');
    router.push('/paywall');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.divider,
          backgroundColor: COLORS.background,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: COLORS.text,
            fontFamily: 'DMSans_600SemiBold',
          }}
        >
          Analyze Document
        </Text>
        <AnimatedPressable
          onPress={handleClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} color={COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 120,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Document Type */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.text,
              fontFamily: 'DMSans_600SemiBold',
            }}
          >
            Document type
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <DocumentTypeChip
                key={option.value}
                label={option.label}
                selected={selectedType === option.value}
                onPress={() => handleTypeSelect(option.value)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Document Input */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable
              onPress={handlePickImage}
              disabled={loading}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 12,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 12,
              }}
            >
              <ImageIcon size={18} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.text,
                  fontFamily: 'DMSans_600SemiBold',
                  fontWeight: '600',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Upload Photo/.PNG
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handlePickPdf}
              disabled={loading}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 12,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 12,
              }}
            >
              <FileText size={18} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.text,
                  fontFamily: 'DMSans_600SemiBold',
                  fontWeight: '600',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Upload PDF
              </Text>
            </AnimatedPressable>
          </View>
          {selectedFileName && (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_500Medium',
                  fontWeight: '500',
                }}
                numberOfLines={1}
              >
                Selected: {selectedFileName}
              </Text>
              {selectedImageUri && (
                <Image
                  source={{ uri: selectedImageUri }}
                  style={{
                    width: '100%',
                    height: 160,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.surfaceSecondary,
                  }}
                  resizeMode="cover"
                />
              )}
            </View>
          )}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.text,
              fontFamily: 'DMSans_600SemiBold',
            }}
          >
            Paste or type document content
          </Text>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}
          >
            <TextInput
              value={documentText}
              onChangeText={(text) => {
                setDocumentText(text);
                setError(null);
              }}
              placeholder="Paste the text from your document here — estimates, quotes, contracts, bills, or any financial document..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              style={{
                minHeight: 200,
                padding: 16,
                fontSize: 15,
                color: COLORS.text,
                fontFamily: 'DMSans_400Regular',
                lineHeight: 22,
                textAlignVertical: 'top',
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'right',
            }}
          >
            {charCount} characters
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View
            style={{
              backgroundColor: COLORS.riskHighBg,
              borderRadius: 12,
              borderCurve: 'continuous',
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(220,38,38,0.15)',
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: COLORS.riskHigh,
                fontFamily: 'DMSans_400Regular',
                lineHeight: 20,
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Analyze Button */}
        <AnimatedPressable
          onPress={handleAnalyze}
          disabled={!canAnalyze}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            borderCurve: 'continuous',
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.white,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Analyze Document
            </Text>
          )}
        </AnimatedPressable>

        {/* Free tier notice */}
        {!isSubscribed && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textTertiary,
                fontFamily: 'DMSans_400Regular',
              }}
            >
              3 free analyses/month ·
            </Text>
            <Pressable onPress={handleUpgradePress}>
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.primary,
                  fontFamily: 'DMSans_500Medium',
                  fontWeight: '500',
                }}
              >
                Upgrade for unlimited
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
