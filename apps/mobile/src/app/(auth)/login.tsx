import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleContinue() {
    Alert.alert(
      'Inicio de sesión',
      'La validación de credenciales se conectará con Supabase en la siguiente etapa.',
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Link href="/(auth)" style={styles.backLink}>‹  Volver</Link>
          <Text style={styles.eyebrow}>BIENVENIDO DE NUEVO</Text>
          <Text style={styles.title}>Inicia sesión</Text>
          <Text style={styles.description}>Ingresa a tu cuenta para continuar.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@correo.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu contraseña"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              style={styles.input}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleContinue}
            style={[styles.primaryButton, (!email.trim() || !password) && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </Pressable>

          <Text style={styles.bottomText}>
            ¿Aún no tienes cuenta? <Link href="/(auth)/register" style={styles.link}>Regístrate</Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 28 },
  backLink: { color: '#1746A2', fontSize: 15, fontWeight: '600', marginBottom: 44 },
  eyebrow: { color: '#1746A2', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  title: { color: '#14213D', fontSize: 30, fontWeight: '800', marginBottom: 8 },
  description: { color: '#64748B', fontSize: 15, marginBottom: 32 },
  fieldGroup: { marginBottom: 18 },
  label: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: '#D8E0EC',
    backgroundColor: '#FFFFFF', paddingHorizontal: 15, color: '#14213D', fontSize: 15,
  },
  primaryButton: {
    minHeight: 54, borderRadius: 14, backgroundColor: '#1746A2',
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  bottomText: { color: '#64748B', textAlign: 'center', marginTop: 26, fontSize: 14 },
  link: { color: '#1746A2', fontWeight: '700' },
});
