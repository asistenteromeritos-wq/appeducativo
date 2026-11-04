import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>A</Text>
        </View>

        <Text style={styles.eyebrow}>PLATAFORMA EDUCATIVA</Text>
        <Text style={styles.title}>La comunidad escolar, más conectada.</Text>
        <Text style={styles.description}>
          Mantente al día con los avisos, actividades y novedades de tu institución.
        </Text>

        <View style={styles.actions}>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Crear una cuenta</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.footer}>Un espacio seguro para acompañar el aprendizaje.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },
  brandMark: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#1746A2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 36,
  },
  brandMarkText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  eyebrow: { color: '#1746A2', fontSize: 12, fontWeight: '800', letterSpacing: 1.8, marginBottom: 14 },
  title: { color: '#14213D', fontSize: 34, lineHeight: 41, fontWeight: '800', marginBottom: 14 },
  description: { color: '#64748B', fontSize: 16, lineHeight: 25, marginBottom: 36 },
  actions: { gap: 12 },
  primaryButton: {
    minHeight: 54, borderRadius: 14, backgroundColor: '#1746A2',
    alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  secondaryButtonText: { color: '#1746A2', fontSize: 16, fontWeight: '700' },
  footer: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 36 },
});
