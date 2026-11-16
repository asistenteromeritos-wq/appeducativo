
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
type Screen = 'welcome' | 'login' | 'register' | 'affiliation';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Datos para el registro
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Datos incompletos',
        'Ingresa tu correo electrónico y contraseña.',
      );
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Error de inicio de sesión', error.message);
        return;
      }

      if (data.session) {
        Alert.alert(
          '¡Bienvenido!',
          'Tu sesión se inició correctamente.',
          [
            {
              text: 'Continuar',
              onPress: () => setScreen('affiliation'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error de conexión',
        'No fue posible conectar con Supabase. Verifica tu conexión a internet.',
      );
    } finally {
      setIsLoading(false);
    }
  };

const handleRecovery = async () => {
  if (!email.trim()) {
    Alert.alert(
      'Recuperar contraseña',
      'Ingresa tu correo electrónico para recibir el enlace de recuperación.'
    );
    return;
  }

  try {
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim()
    );

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Solicitud enviada',
      'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.'
    );
  } catch (error) {
    Alert.alert(
      'Error de conexión',
      'No fue posible solicitar la recuperación de contraseña.'
    );
  } finally {
    setIsLoading(false);
  }
};

  
const handleRegister = async () => {
  if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
    Alert.alert(
      'Datos incompletos',
      'Completa todos los campos para continuar.'
    );
    return;
  }

  if (password.length < 6) {
    Alert.alert(
      'Contraseña inválida',
      'La contraseña debe tener al menos 6 caracteres.'
    );
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert(
      'Contraseñas diferentes',
      'Las contraseñas ingresadas no coinciden.'
    );
    return;
  }

  try {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      Alert.alert('Error de registro', error.message);
      return;
    }

    if (data.session) {
      Alert.alert(
        '¡Cuenta creada!',
        'Tu registro se realizó correctamente.'
      );
    } else {
      Alert.alert(
        '¡Registro realizado!',
        'Revisa tu correo electrónico para confirmar tu cuenta.'
      );
    }

    setFullName('');
    setPassword('');
    setConfirmPassword('');
    setScreen('login');

  } catch (error) {
    Alert.alert(
      'Error de conexión',
      'No fue posible conectar con Supabase.'
    );
  } finally {
    setIsLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {screen === 'welcome' ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.topDecoration} />

              <View style={styles.brand}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>CE</Text>
                </View>
                <Text style={styles.brandName}>COMUNIDAD ESCOLAR</Text>
                <Text style={styles.brandSubtitle}>
                  Conectando familias y colegio
                </Text>
              </View>

              <View style={styles.illustration}>
                <View style={styles.illustrationCircle}>
                  <Text style={styles.illustrationEmoji}>🎓</Text>
                  <View style={styles.smallBubble}>
                    <Text style={styles.bubbleEmoji}>📚</Text>
                  </View>
                  <View style={styles.smallBubbleRight}>
                    <Text style={styles.bubbleEmoji}>💬</Text>
                  </View>
                </View>
              </View>

              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle}>
                  ¡Bienvenido a tu{'\n'}
                  <Text style={styles.highlightText}>
                    comunidad escolar!
                  </Text>
                </Text>

                <Text style={styles.welcomeDescription}>
                  Mantente informado sobre las actividades, comunicados y
                  novedades del colegio desde un solo lugar.
                </Text>
              </View>

              <View style={styles.features}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text>🔔</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>
                      Notificaciones oportunas
                    </Text>
                    <Text style={styles.featureDescription}>
                      Recibe avisos importantes del colegio.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text>👨‍👩‍👧</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>
                      Información de tus hijos
                    </Text>
                    <Text style={styles.featureDescription}>
                      Consulta sus comunicados y actividades.
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={() => setScreen('login')}
              >
                <Text style={styles.primaryButtonText}>
                  Comenzar
                </Text>
                <Text style={styles.buttonArrow}>→</Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>
                Una comunicación más cercana entre el colegio y tu familia.
              </Text>
            </View>
          ) : screen === 'login' ? (
            <View style={styles.loginContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setScreen('welcome')}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>‹</Text>
                <Text style={styles.backLabel}>Volver</Text>
              </TouchableOpacity>

              <View style={styles.loginHeader}>
                <View style={styles.loginLogo}>
                  <Text style={styles.logoText}>CE</Text>
                </View>

                <Text style={styles.loginTitle}>
                  ¡Hola de nuevo!
                </Text>
                <Text style={styles.loginDescription}>
                  Ingresa a tu cuenta para mantenerte conectado con tu
                  comunidad escolar.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.inputLabel}>
                  Correo electrónico
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✉</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="#9CA8B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.inputLabel}>
                  Contraseña
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor="#9CA8B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.showPassword}>
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.recoveryButton}
                  onPress={handleRecovery}
                >
                  <Text style={styles.recoveryText}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.85}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.securityNote}>
                <Text style={styles.securityIcon}>🛡️</Text>
                <Text style={styles.securityText}>
                  Tu información y la de tu familia se mantienen protegidas.
                </Text>
              </View>

              
              <Text style={styles.loginFooter}>
                COMUNIDAD ESCOLAR
              </Text>
              <TouchableOpacity
                onPress={() => setScreen('register')}
                style={{ marginTop: 20, alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Text style={styles.recoveryText}>
                  ¿No tienes cuenta? Crear cuenta
                </Text>
              </TouchableOpacity>
            </View>
          ) : screen === 'affiliation' ? (
            <View style={{
              flex: 1,
              padding: 25,
              justifyContent: 'center',
              backgroundColor: '#F5F7FB',
            }}>
              <TouchableOpacity
                onPress={() => setScreen('login')}
                style={{ marginBottom: 35 }}
              >
                <Text style={{ fontSize: 18, color: '#2563EB' }}>
                  ‹ Volver
                </Text>
              </TouchableOpacity>

              <Text style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#1E293B',
                marginBottom: 12,
              }}>
                Afiliarme a mi colegio
              </Text>

              <Text style={{
                fontSize: 16,
                color: '#64748B',
                marginBottom: 30,
              }}>
                Ingresa el código de afiliación que te proporcionó tu colegio.
              </Text>

              <TextInput
                placeholder="Código de afiliación"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  marginBottom: 20,
                }}
              />

              <TouchableOpacity
                onPress={() => Alert.alert(
                  'Afiliación',
                  'La validación del código estará disponible próximamente.'
                )}
                style={{
                  backgroundColor: '#2563EB',
                  padding: 17,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                  Continuar
                </Text>
              </TouchableOpacity>
            </View>
            ) : (
            <View style={styles.loginContainer}>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setScreen('login')}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>‹</Text>
                <Text style={styles.backLabel}>Volver al inicio de sesión</Text>
              </TouchableOpacity>

              <View style={styles.loginHeader}>
                <View style={styles.loginLogo}>
                  <Text style={styles.logoText}>CE</Text>
                </View>

                <Text style={styles.loginTitle}>
                  Crear una cuenta
                </Text>
                <TouchableOpacity
                  onPress={() => setScreen('login')}
                  style={{ marginTop: 25, alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recoveryText}>
                    ¿Ya tienes cuenta? Inicia sesión
                  </Text>
                </TouchableOpacity>

                <Text style={styles.loginDescription}>
                  Regístrate para conectarte con la comunidad de tu colegio.
                </Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.inputLabel}>Nombres y apellidos</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresa tus nombres completos"
                    placeholderTextColor="#9CA8B8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>

                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✉</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="#9CA8B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9CA8B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.showPassword}>
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirmar contraseña</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔐</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#9CA8B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    <Text style={styles.showPassword}>
                      {showConfirmPassword ? 'Ocultar' : 'Ver'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.85}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.securityNote}>
                <Text style={styles.securityIcon}>🛡️</Text>
                <Text style={styles.securityText}>
                  Tus datos personales se mantienen protegidos.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setScreen('login')}
                style={{ marginTop: 25, alignItems: 'center' }}
              >
                <Text style={styles.recoveryText}>
                  ¿Ya tienes cuenta? Inicia sesión
                </Text>
              </TouchableOpacity>

              <Text style={styles.loginFooter}>
                COMUNIDAD ESCOLAR
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Bienvenida
  welcomeContainer: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 35,
    paddingBottom: 25,
    alignItems: 'center',
  },
  topDecoration: {
    position: 'absolute',
    top: -130,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#E5EFFD',
  },
  brand: {
    alignItems: 'center',
  },
  logo: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#174A83',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 13,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandName: {
    color: '#174A83',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: '#8290A3',
    fontSize: 12,
    marginTop: 5,
  },
  illustration: {
    marginTop: 35,
    marginBottom: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#E5EFFD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4E4F8',
  },
  illustrationEmoji: {
    fontSize: 86,
  },
  smallBubble: {
    position: 'absolute',
    left: -12,
    top: 25,
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  smallBubbleRight: {
    position: 'absolute',
    right: -12,
    bottom: 22,
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  bubbleEmoji: {
    fontSize: 23,
  },
  welcomeTextContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    color: '#172B4D',
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '800',
    textAlign: 'center',
  },
  highlightText: {
    color: '#2475C5',
  },
  welcomeDescription: {
    color: '#718096',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 13,
    maxWidth: 320,
  },
  features: {
    width: '100%',
    marginTop: 27,
    gap: 17,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  featureIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#E7F0FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#263B59',
    fontSize: 13,
    fontWeight: '700',
  },
  featureDescription: {
    color: '#8793A4',
    fontSize: 12,
    marginTop: 3,
  },
  primaryButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#1D5B99',
    borderRadius: 16,
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    position: 'absolute',
    right: 22,
  },
  footerText: {
    color: '#9AA6B5',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
  },

  // Inicio de sesión
  loginContainer: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 25,
    paddingBottom: 25,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  backButtonText: {
    fontSize: 32,
    color: '#174A83',
    lineHeight: 35,
  },
  backLabel: {
    color: '#52657D',
    fontSize: 13,
    fontWeight: '600',
  },
  loginHeader: {
    alignItems: 'center',
    marginTop: 42,
  },
  loginLogo: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: '#174A83',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  loginTitle: {
    color: '#172B4D',
    fontSize: 28,
    fontWeight: '800',
  },
  loginDescription: {
    color: '#8290A3',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  form: {
    marginTop: 42,
  },
  inputLabel: {
    color: '#344761',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 18,
  },
  inputContainer: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#DFE7F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  inputIcon: {
    fontSize: 17,
    marginRight: 11,
    color: '#6D819B',
  },
  input: {
    flex: 1,
    color: '#263B59',
    fontSize: 14,
    paddingVertical: 14,
  },
  showPassword: {
    color: '#2475C5',
    fontSize: 12,
    fontWeight: '700',
    paddingLeft: 8,
  },
  recoveryButton: {
    alignSelf: 'flex-end',
    marginTop: 15,
  },
  recoveryText: {
    color: '#2475C5',
    fontSize: 12,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FB',
    padding: 15,
    borderRadius: 13,
    marginTop: 35,
    gap: 10,
  },
  securityIcon: {
    fontSize: 19,
  },
  securityText: {
    flex: 1,
    color: '#526B89',
    fontSize: 11,
    lineHeight: 17,
  },
  loginFooter: {
    textAlign: 'center',
    color: '#A0ACBA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 35,
  },
});
