import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import { configPath, loadConfig } from '../../core/config';
import {
  finishDeviceLogin,
  loginWithToken,
  pollDeviceLogin,
  startDeviceLogin,
} from '../../core/services';
import type { DeviceStart } from '../../core/types';
import { colors } from '../theme';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LoginScreen({
  onLoggedIn,
  onQuit,
}: {
  onLoggedIn: () => void;
  onQuit: () => void;
}) {
  const [mode, setMode] = useState<'device' | 'token'>('device');
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useInput((input, key) => {
    if (key.escape || input === 'q') onQuit();
    if (input === 't') setMode('token');
  }, { isActive: mode === 'device' });

  useInput((_, key) => {
    if (key.escape) setMode('device');
  }, { isActive: mode === 'token' });

  useEffect(() => {
    if (mode !== 'device') return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const apiUrl = (await loadConfig()).apiUrl;
        const started = await startDeviceLogin(apiUrl);
        if (cancelled) return;
        setDevice(started);
        setBusy(false);
        const deadline = Date.now() + started.expiresIn * 1000;
        while (!cancelled && Date.now() < deadline) {
          await sleep((started.interval || 3) * 1000);
          const poll = await pollDeviceLogin(apiUrl, started.deviceCode);
          if (cancelled) return;
          if (poll.status === 'authorized' && poll.token) {
            await finishDeviceLogin(apiUrl, poll.token);
            onLoggedIn();
            return;
          }
          if (poll.status === 'expired') {
            setError('El código caducó. Pulsa t para pegar un PAT o reinicia.');
            return;
          }
        }
        if (!cancelled) setError('Tiempo de espera agotado.');
      } catch (err) {
        if (!cancelled) {
          setBusy(false);
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, onLoggedIn]);

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color={colors.primaryHi}>
        Entrar a Klarify
      </Text>
      <Text color={colors.muted}>Los agentes siguen usando `klarify login --token` / env.</Text>
      {error ? <Text color={colors.danger}>{error}</Text> : null}

      {mode === 'device' ? (
        <Box flexDirection="column" gap={1}>
          {busy && !device ? <Spinner label="Pidiendo código…" /> : null}
          {device ? (
            <>
              <Text color={colors.muted}>Abre en el navegador:</Text>
              <Text color={colors.primaryHi}>{device.verificationUriComplete}</Text>
              <Text color={colors.muted}>Código</Text>
              <Text bold color={colors.ink}>
                {device.userCode}
              </Text>
              <Spinner label="Esperando autorización…" />
            </>
          ) : null}
          <Text color={colors.faint}>t pegar PAT · q salir</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          <Text color={colors.muted}>PAT (klf_…) · se guarda en {configPath()}</Text>
          <TextInput
            placeholder="klf_…"
            onSubmit={(value) => {
              void (async () => {
                try {
                  const apiUrl = (await loadConfig()).apiUrl;
                  await loginWithToken(value.trim(), apiUrl);
                  onLoggedIn();
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              })();
            }}
          />
          <Text color={colors.faint}>enter guardar · esc volver al código</Text>
        </Box>
      )}
    </Box>
  );
}
