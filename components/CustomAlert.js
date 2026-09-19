import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '', buttons: [] });

  const alert = useCallback((title, message, buttons = [{ text: 'OK' }]) => {
    setConfig({ title, message, buttons });
    setVisible(true);
  }, []);

  const handlePress = (button) => {
    setVisible(false);
    setTimeout(() => {
      if (button.onPress) button.onPress();
    }, 50);
  };

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {!!config.title && <Text style={styles.title}>{config.title}</Text>}
            {!!config.message && <Text style={styles.message}>{config.message}</Text>}
            <View style={styles.buttonRow}>
              {config.buttons.map((button, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.button,
                    i > 0 && styles.buttonBorder,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handlePress(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'destructive' && styles.destructiveText,
                      button.style === 'cancel' && styles.cancelText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 21, 18, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingTop: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  message: {
    ...typography.subhead,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  buttonPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  destructiveText: {
    color: colors.danger,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
