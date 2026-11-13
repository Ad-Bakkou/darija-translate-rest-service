import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { translate, checkHealth } from './src/services/nativeApi';
import { accountStore } from './src/services/account';
import { ClientError, codePoints, validateAccount, validateText } from './src/utils/validation';
import { LatestRequest } from './src/utils/latest';
import type { Account } from './src/types/translation';

const store = accountStore(SecureStore);
type ButtonProps = { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean };
function Button({ title, onPress, disabled, secondary }: ButtonProps) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || pressed) && styles.dim]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}
function Screen() {
  const [text, setText] = useState(''); const [output, setOutput] = useState('');
  const [message, setMessage] = useState('Write or paste English text to get started.');
  const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false); const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [ready, setReady] = useState(false); const [saving, setSaving] = useState(false); const [persistent, setPersistent] = useState(false);
  const [accountPresent, setAccountPresent] = useState(false);
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const account = useRef<Account | null>(null); const active = useRef(false); const mounted = useRef(true);
  const latest = useRef(new LatestRequest()).current; const healthAbort = useRef<AbortController | null>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const feedback = (value: string, failure = false) => { setMessage(value); setError(failure); };
  function cancel() { latest.cancel(); active.current = false; setBusy(false); }
  async function refreshHealth() {
    healthAbort.current?.abort(); const controller = new AbortController(); healthAbort.current = controller;
    setHealth('checking'); const online = await checkHealth({ signal: controller.signal });
    if (mounted.current && !controller.signal.aborted) setHealth(online ? 'online' : 'offline');
  }
  useEffect(() => {
    mounted.current = true; refreshHealth();
    (async () => {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (mounted.current) setPersistent(available);
        const saved = available ? await store.load() : null;
        if (!mounted.current) return;
        setPersistent(available); account.current = saved; setAccountPresent(!!saved);
        setUsername(saved?.username ?? ''); setSettings(!saved);
      } catch {
        if (mounted.current) { setSettings(true); feedback('Saved account could not be read. Retry saving or forgetting the account; no saved credentials were loaded.', true); }
      } finally { if (mounted.current) setReady(true); }
    })();
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { cancel(); setPassword(''); healthAbort.current?.abort(); }
    });
    return () => { mounted.current = false; latest.cancel(); healthAbort.current?.abort(); subscription.remove(); };
  }, []);
  async function submit() {
    if (active.current || !ready || saving) return;
    try { validateText(text); validateAccount(account.current); }
    catch (e) { feedback((e as ClientError).message, true); if ((e as ClientError).code === 'ACCOUNT') setSettings(true); return; }
    const credentials = account.current;
    active.current = true; setBusy(true); setOutput(''); Keyboard.dismiss(); feedback('Translating into Moroccan Darija…');
    await latest.run(signal => translate(text, credentials, { signal }), {
      success: result => { setOutput(result.translatedText); feedback('Translation ready.'); },
      failure: e => {
        feedback(e instanceof ClientError ? e.message : 'The request could not be completed.', true);
        if (e instanceof ClientError && e.code === '401') setSettings(true);
      }, settled: () => { active.current = false; setBusy(false); }
    });
  }
  async function save() {
    if (saving || !ready) return;
    const value = { username, password };
    try { validateAccount(value); } catch (e) { feedback((e as ClientError).message, true); return; }
    cancel(); setSaving(true); setOutput('');
    try {
      if (persistent) await store.save(value);
      account.current = value; setAccountPresent(true); setPassword(''); setSettings(false); Keyboard.dismiss();
      feedback(persistent ? 'Account saved in device secure storage. Tap Translate when ready.' : 'Account saved in memory for this session. Tap Translate when ready.');
    } catch { feedback('Could not save the account in secure storage. Try again; credentials were not changed.', true); }
    finally { setSaving(false); }
  }
  async function forget() {
    if (saving || !ready) return;
    cancel(); setSaving(true); account.current = null; setAccountPresent(false); setUsername(''); setPassword(''); setOutput('');
    try { await store.forget(); feedback('Account forgotten. Add credentials to translate again.'); }
    catch { feedback('Account cleared from memory, but stored deletion failed. Retry Forget before closing the app.', true); }
    finally { setSaving(false); }
  }
  async function copy() {
    try { if (!(await Clipboard.setStringAsync(output))) throw new Error(); feedback('Translation copied.'); }
    catch { feedback('Could not copy. Long-press the translation to select it.', true); }
  }
  function changeText(value: string) { cancel(); setText(value); setOutput(''); feedback('Ready when you are.'); }
  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.eyebrow}>YOUR WORDS, IN DARIJA</Text>
        <View style={styles.row}><Text accessibilityRole="header" style={styles.title}>DarijaTranslate</Text>
          <Button title={settings ? 'Close settings' : 'Settings'} secondary onPress={() => { setSettings(!settings); setPassword(''); }} /></View>
        <Text style={styles.subtitle}>English to Moroccan Darija</Text>
        <View style={styles.row}><Text style={styles.status}>{health === 'checking' ? 'Checking local service…' : health === 'online' ? '● Local service online' : '○ Local service unreachable'}</Text>
          <Button title="Check connection" secondary disabled={health === 'checking'} onPress={refreshHealth} /></View>
        {settings && <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>Translator account</Text>
          <Text style={styles.hint}>{!ready ? 'Loading account…' : persistent ? 'Stored with the device’s secure storage.' : 'Session only: credentials are held in memory.'} {accountPresent ? 'An account is configured.' : ''}</Text>
          <Text style={styles.label}>Username</Text>
          <TextInput accessibilityLabel="Translator username" style={styles.field} value={username} onChangeText={setUsername} editable={!saving && ready} autoCapitalize="none" autoCorrect={false} autoComplete="off" />
          <Text style={styles.label}>Password</Text>
          <TextInput accessibilityLabel="Translator password" style={styles.field} value={password} onChangeText={setPassword} editable={!saving && ready} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" />
          <View style={styles.row}><Button title={saving ? 'Saving…' : 'Save account'} disabled={saving || !ready} onPress={save} /><Button title="Forget account" secondary disabled={saving || !ready} onPress={forget} /></View>
        </View>}
        <View style={styles.card}>
          <View style={styles.row}><Text accessibilityRole="header" style={styles.heading}>English text</Text><Button title="Clear" secondary onPress={() => { changeText(''); input.current?.focus(); }} /></View>
          <TextInput ref={input} accessibilityLabel="English text to translate" multiline textAlignVertical="top" style={[styles.field, styles.source]} value={text} onChangeText={changeText} placeholder="Write or paste your English text…" placeholderTextColor="#63776e" />
          <Text style={[styles.counter, codePoints(text) > 5000 && styles.errorText]}>{codePoints(text).toLocaleString()} / 5,000</Text>
          <Button title={busy ? 'Translating…' : 'Translate to Darija ↗'} onPress={submit} disabled={busy || saving || !ready} />
          {busy && <View style={styles.row}><ActivityIndicator color="#176b56" accessibilityLabel="Translation in progress" /><Button title="Cancel translation" secondary onPress={() => { cancel(); feedback('Translation cancelled.'); }} /></View>}
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.feedback, error && styles.errorText]}>{message}</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text accessibilityRole="header" style={styles.heading}>Moroccan Darija</Text><Button title="Copy" secondary disabled={!output} onPress={copy} /></View>
          {output ? <Text selectable style={styles.result}>{output}</Text> : <Text style={styles.empty}>Your translation will appear here.</Text>}
        </View>
        <Text style={styles.footer}>Powered by your authenticated local Java service.{ '\n' }Connection status checks the server, not Gemini availability.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Screen /></SafeAreaProvider>; }
const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#f4f7f4' }, page: { padding: 20, gap: 12, maxWidth: 680, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#42655c', letterSpacing: 2, fontSize: 11, fontWeight: '700', marginTop: 12 },
  title: { color: '#193b35', fontSize: 28, fontWeight: '800', letterSpacing: -1, flexShrink: 1 }, subtitle: { fontSize: 16, color: '#4e645e' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  card: { padding: 18, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe5df', gap: 12 },
  heading: { color: '#193b35', fontWeight: '700', fontSize: 18, flexShrink: 1 },
  field: { borderWidth: 1, borderColor: '#8da99c', borderRadius: 10, padding: 14, fontSize: 17, color: '#193b35', backgroundColor: '#fcfdfb', minHeight: 48 },
  source: { minHeight: 160, textAlign: 'left', writingDirection: 'ltr' }, label: { color: '#193b35', fontSize: 15, fontWeight: '600' },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#176b56', alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#edf4ef', borderColor: '#a8bcb3', borderWidth: 1 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' }, secondaryText: { color: '#176b56' }, dim: { opacity: .5 },
  status: { color: '#42655c', fontSize: 13, flexShrink: 1 }, hint: { color: '#586b64', lineHeight: 21 }, counter: { color: '#586b64', textAlign: 'right', fontSize: 13 },
  feedback: { color: '#315c4c', lineHeight: 23, paddingHorizontal: 4 }, errorText: { color: '#9b2927' },
  result: { color: '#193b35', fontSize: 25, lineHeight: 43, textAlign: 'right', writingDirection: 'rtl', paddingVertical: 12 },
  empty: { color: '#586b64', paddingVertical: 24 }, footer: { color: '#586b64', fontSize: 12, lineHeight: 20, marginBottom: 20 }
});
