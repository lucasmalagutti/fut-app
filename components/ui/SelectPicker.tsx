import { ChevronDown, X, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface SelectPickerProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function SelectPicker({
  label,
  placeholder = 'Selecione...',
  value,
  options,
  onChange,
  error,
  disabled = false,
  searchable = false,
}: SelectPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setSearch('');
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, !!error && styles.triggerError, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={18} color={colors.neutral[400]} />
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label ?? 'Selecione'}</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }} hitSlop={12}>
              <X size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.searchWrapper}>
              <Search size={16} color={colors.neutral[400]} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar..."
                placeholderTextColor={colors.neutral[400]}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.option, item.value === value && styles.optionSelected]}
                onPress={() => handleSelect(item.value)}
              >
                <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  triggerError: { borderColor: colors.error },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: 15, color: colors.text.primary, flex: 1 },
  placeholder: { color: colors.neutral[400] },
  error: { fontSize: 12, color: colors.error },

  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text.primary },

  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  optionSelected: { backgroundColor: colors.primary[50] },
  optionText: { fontSize: 15, color: colors.text.primary },
  optionTextSelected: { color: colors.primary[600], fontWeight: '600' },
  separator: { height: 1, backgroundColor: colors.border, opacity: 0.5 },
});
