import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Role = 'parent' | 'professionnel';

interface Props {
  activeRole: Role;
  targetRole: Role; // Only allow switching to this role in the current screen
  accentColor: string; // Button color depends on current interface (pro vs parent)
  onToggle: (nextRole: Role) => void;
}

export const RoleSwitcher: React.FC<Props> = ({ activeRole, targetRole, accentColor, onToggle }) => {
  const label = targetRole === 'professionnel' ? 'Passer en mode Pro' : 'Passer en mode Parent';
  const isDisabled = activeRole === targetRole; // Already on that role (defensive)

  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={isDisabled}
        style={[styles.button, { backgroundColor: accentColor, opacity: isDisabled ? 0.6 : 1 }]}
        onPress={() => onToggle(targetRole)}
      >
        <Text style={styles.text}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end' },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  text: { color: '#fff', fontWeight: '700' },
});

export default RoleSwitcher;
