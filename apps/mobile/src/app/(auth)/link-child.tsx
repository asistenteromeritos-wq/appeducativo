import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LinkChildScreen() {
  const [studentCode, setStudentCode] = useState('');

  function handleLink() {
    Alert.alert(
      'Vincular estudiante',
      'La verificación del código y el vínculo con el apoderado se implementarán al conectar el backend.',
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Link href="/(auth)" style={styles.backLink}>‹  Volver</Link>
        <View style={styles.iconCircle}><Text style={styles.iconText}>＋</Text></View>
        <Text style={styles.title}>Vincula a tu estudiante</Text>
        <Text style={styles.description}>
          Ingresa el código de vinculación proporcionado por la institución educativa.
        </Text>
        <Text style={styles.label}>Código de vinculación</Text>
        <TextInput
          value={studentCode}
          onChangeText={setStudentCode}
          placeholder="Ej. ABC12345"
          placeholderTextColor="#94A3B8"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          onPress={handleLink}
          style={[styles.primaryButton, !studentCode.trim() && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>Continuar</Text>
        </Pressable>
        <Text style={styles.note}>
          Si todavía no tienes un código, solicítalo a la institución educativa.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 28 },
  backLink: { color: '#1746A2', fontSize: 15, fontWeight: '600', marginBottom: 34 },
  iconCircle: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  iconText: { color: '#1746A2', fontSize: 32, fontWeight: '500', lineHeight: 36 },
  title: { color: '#14213D', fontSize: 28, lineHeight: 34, fontWeight: '800', marginBottom: 10 },
  description: { color: '#64748B', fontSize: 15, lineHeight: 23, marginBottom: 30 },
  label: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF', paddingHorizontal: 15, color: '#14213D', fontSize: 15, marginBottom: 18 },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: '#1746A2', alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  note: { color: '#94A3B8', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 },
});
