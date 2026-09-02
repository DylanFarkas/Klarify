import { useEffect, useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import { loadConfig } from '../../core/config';
import {
  finishDeviceLogin,
  loginWithToken,
  pollDeviceLogin,
  startDeviceLogin,
} from '../../core/services';
import type { DeviceStart } from '../../core/types';
import { Hints, Landing, Tip } from '../components/Landing';
import { useTheme } from '../theme';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spacedCode(code: string): string {
  return code.replace(/[-]/g, ' · ').toUpperCase();
}

export function LoginScreen({
  onLoggedIn,
  onQuit,
}: {
  onLoggedIn: () => void;
  onQuit: () => void;
}) {
  const { colors } = useTheme();
  const { columns, rows } = useWindowSize();
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
            setError('El código caducó. Pulsa t para pegar un PAT.');
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

  const body =
    mode === 'token' ? (
      <Box flexDirection="column">
        <Text color={colors.muted}>Pega tu PAT de Klarify</Text>
        <Box marginTop={1} width={Math.min(48, columns - 10)}>
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
        </Box>
      </Box>
    ) : (
      <Box flexDirection="column">
        {busy && !device ? <Spinner label="Pidiendo código…" /> : null}
        {device ? (
          <>
            <Text bold color={colors.white}>
              {spacedCode(device.userCode)}
            </Text>
            <Box marginTop={2}>
              <Text color={colors.muted}>Abre este enlace en el navegador</Text>
            </Box>
            <Box marginTop={1} width={Math.min(columns - 8, 80)} overflow="hidden">
              <Text color={colors.accent} wrap="wrap">
                {device.verificationUriComplete}
              </Text>
            </Box>
            <Box marginTop={2}>
              <Spinner label="Esperando autorización" />
            </Box>
          </>
        ) : null}
      </Box>
    );

  return (
    <Landing
      columns={columns}
      rows={rows}
      title={mode === 'token' ? 'Token de acceso' : 'Iniciar sesión'}
      meta={
        mode === 'token'
          ? 'El token se guarda en ~/.klarify/config.json'
          : 'Autoriza este dispositivo para entrar al workspace.'
      }
      error={error}
      showPath={false}
      hints={
        mode === 'token' ? (
          <Hints items={[['enter', 'guardar'], ['esc', 'código']]} />
        ) : (
          <Hints items={[['t', 'PAT'], ['q', 'salir']]} />
        )
      }
      tip={
        mode === 'token' ? (
          <Tip>Los agentes también pueden usar klarify login --token</Tip>
        ) : undefined
      }
    >
      {body}
    </Landing>
  );
}
