import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraUserActor } from '../utils/actors';
import { Principal } from '@dfinity/principal';
import { colors, shadows } from '../theme/tokens';
import { ThreeDotLoader } from './ThreeDotLoader';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface RegistrationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RegistrationModal({ visible, onClose }: RegistrationModalProps) {
  const { principal, setRegistrationStatus, getIdentity } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const displayNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const generateUsernameFromPrincipal = (p: string): string => {
    try {
      const base = p.replace(/[^a-zA-Z0-9]/g, '');
      let hash = 5381;
      for (let i = 0; i < p.length; i++) {
        hash = ((hash << 5) + hash) + p.charCodeAt(i);
        hash |= 0;
      }
      const suffix = Math.abs(hash).toString(36).slice(0, 5);
      const core = base.slice(0, 5).toLowerCase();
      let candidate = `rider-${core}${suffix ? '-' + suffix : ''}`;
      if (candidate.length > 20) candidate = candidate.slice(0, 20);
      if (candidate.length < 3) candidate = `rider-${suffix || 'ic'}`;
      return candidate;
    } catch {
      return `rider-${Math.random().toString(36).slice(2, 8)}`;
    }
  };

  useEffect(() => {
    if (visible && principal) {
      const auto = generateUsernameFromPrincipal(principal);
      setUsername(auto);
      setError(null);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, principal, fadeAnim, slideAnim]);

  const handleRegister = async () => {
    if (!principal) {
      setError('No principal found. Please log in again.');
      setSubmitting(false);
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const identity = getIdentity();
      if (!identity) {
        setError('Failed to get authenticated identity');
        setSubmitting(false);
        return;
      }

      const userActor = getBikeraUserActor({}, identity);
      let usernameToUse = username || generateUsernameFromPrincipal(principal);

      const registerPromise = userActor.registerUser(
        usernameToUse,
        email ? [email] : [],
        displayName ? [displayName] : [],
        [],
        Principal.fromText(principal)
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Registration request timed out')), 30000)
      );

      let result: any = await Promise.race([registerPromise, timeoutPromise]);

      if (
        result &&
        typeof result === 'object' &&
        'err' in result &&
        String(result.err).toLowerCase().includes('taken')
      ) {
        const extra = Math.random().toString(36).slice(2, 4);
        usernameToUse = (usernameToUse + '-' + extra).slice(0, 20);
        result = await userActor.registerUser(
          usernameToUse,
          email ? [email] : [],
          displayName ? [displayName] : [],
          [],
          Principal.fromText(principal)
        );
      }

      if (result && typeof result === 'object' && 'ok' in result) {
        await setRegistrationStatus(true, usernameToUse, email);
        setSubmitting(false);
        onClose();
      } else if (result && typeof result === 'object' && 'err' in result) {
        setError(String(result.err) || 'Registration failed');
        setSubmitting(false);
      } else {
        setError('Registration failed - unexpected response');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(String(err?.message || err || 'Registration failed'));
      setSubmitting(false);
    }
  };

  if (!principal) return null;

  return (
    <Modal
      visible={visible && !!principal}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/* IMPORTANT: box-none so backdrop and content can each handle touches correctly */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Backdrop catches only outside taps */}
        <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose} />

        {/* Content area should not steal backdrop touches */}
        <View pointerEvents="box-none" style={styles.contentArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={Platform.OS === 'ios'}
              style={styles.scrollView}
              nestedScrollEnabled={Platform.OS === 'android'}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
            >
              {/* Plain View - Pressable was stealing touches from TextInput on Android */}
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Animated.View
                  style={[
                    styles.modalContent,
                    {
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerContent}>
                      <View style={styles.iconBadge}>
                        <Ionicons name="person-add" size={24} color={colors.brandPurple} />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={styles.title}>Create Your Account</Text>
                        <Text style={styles.subtitle}>Just a few details to get started</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={onClose}
                      style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
                      disabled={submitting}
                    >
                      <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Error */}
                  {error && (
                    <Animated.View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={18} color="#ef4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  )}

                  {/* Form */}
                  <View style={styles.form}>
                    {/* Username */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Auto</Text>
                        </View>
                      </View>

                      <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                        <TextInput
                          value={username}
                          editable={false}
                          style={[styles.input, styles.inputDisabled]}
                          placeholder="Generating username..."
                          placeholderTextColor={colors.textTertiary}
                        />
                        <Ionicons name="lock-closed" size={16} color={colors.textTertiary} />
                      </View>

                      <Text style={styles.helperText}>Generated from your Internet Identity</Text>
                    </View>

                    {/* Display Name */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Ionicons name="text-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.label}>Display Name</Text>
                        <Text style={styles.optionalLabel}>Optional</Text>
                      </View>

                      <View style={styles.inputContainer}>
                        <TextInput
                          ref={displayNameRef}
                          value={displayName}
                          onChangeText={setDisplayName}
                          style={styles.input}
                          placeholder="John Doe"
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="next"
                          onSubmitEditing={() => emailRef.current?.focus()}
                          editable={!submitting}
                        />
                      </View>
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.optionalLabel}>Optional</Text>
                      </View>

                      <View style={styles.inputContainer}>
                        <TextInput
                          ref={emailRef}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={styles.input}
                          placeholder="you@example.com"
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="done"
                          onSubmitEditing={handleRegister}
                          editable={!submitting}
                        />
                      </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                      <Pressable
                        onPress={onClose}
                        disabled={submitting}
                        style={({ pressed }) => [
                          styles.cancelButton,
                          pressed && styles.cancelButtonPressed,
                          submitting && styles.buttonDisabled,
                        ]}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleRegister}
                        disabled={submitting || !principal}
                        style={({ pressed }) => [
                          styles.registerButton,
                          pressed && styles.registerButtonPressed,
                          (submitting || !principal) && styles.buttonDisabled,
                        ]}
                      >
                        <LinearGradient
                          colors={[colors.brandPurple, colors.brandBlue100]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.registerGradient}
                        >
                          {submitting ? (
                            <View style={styles.loadingContainer}>
                              <ThreeDotLoader color="white" size="small" />
                            </View>
                          ) : (
                            <View style={styles.registerButtonContent}>
                              <Text style={styles.registerButtonText}>Create Account</Text>
                              <Ionicons name="arrow-forward" size={18} color="white" />
                            </View>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  contentArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    flexGrow: 1,
    // ✅ IMPORTANT: avoid center on Android (causes jump when keyboard opens)
    justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-start',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 24,
    padding: Platform.OS === 'ios' ? 24 : 20,
    width: '100%',
    maxWidth: SCREEN_WIDTH > 520 ? 520 : SCREEN_WIDTH - 32,
    alignSelf: 'center',
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...shadows.soft,
    shadowColor: colors.brandPurple,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flex: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandPurple + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 24 : 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonPressed: {
    backgroundColor: colors.border1,
    transform: [{ scale: 0.95 }],
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 0,
    width: '100%',
  },
  referralBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.brandPurple + '12',
    borderWidth: 1,
    borderColor: colors.brandPurple + '2A',
  },
  referralBadgeText: {
    fontSize: 12,
    color: colors.brandPurple,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  optionalLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: colors.brandPurple + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: colors.surface2,
    borderColor: colors.border1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    width: '100%',
  },
  inputContainerFocused: {
    borderColor: colors.brandPurple,
    backgroundColor: colors.surface1,
    borderWidth: 2,
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainerDisabled: {
    backgroundColor: colors.surface2,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    width: '100%',
  },
  inputDisabled: {
    opacity: 0.7,
    color: colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    marginLeft: 0,
    fontWeight: '400',
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border1,
    width: '100%',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cancelButtonPressed: {
    backgroundColor: colors.border1,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  registerButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 52,
    ...shadows.soft,
    shadowColor: colors.brandPurple,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  registerButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  registerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    width: '100%',
  },
});
