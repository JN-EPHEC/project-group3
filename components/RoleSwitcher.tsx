import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Role = 'parent' | 'professionnel';

interface Props {
  activeRole: Role;
  onToggle: (nextRole: Role) => void;
}

export const RoleSwitcher: React.FC<Props> = ({ activeRole, onToggle }) => {
  const nextRole: Role = activeRole === 'parent' ? 'professionnel' : 'parent';
  const label = nextRole === 'professionnel' ? 'Passer en mode Pro' : 'Passer en mode Parent';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => onToggle(nextRole)}>
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
    backgroundColor: '#1E88E5',
  },
  text: { color: '#fff', fontWeight: '700' },
});

export default RoleSwitcher;
