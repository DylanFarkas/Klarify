import { useEffect, useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import {
  API_ENVIRONMENTS,
  environmentForApiUrl,
} from '../../core/api-urls';
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
  // Mantener el guion canónico (ABCD-WXYZ) para copiar/pegar en la web.
  return code.replace(/\s+/g, '').toUpperCase();
}

type Phase = 'env' | 'device' | 'token';

export function LoginScreen({
  onLoggedIn,
  onQuit,
}: {
  onLoggedIn: () => void;
  onQuit: () => void;
}) {
  const { colors } = useTheme();
  const { columns, rows } = useWindowSize();
  const [phase, setPhase] = useState<Phase>('env');
  const [envIndex, setEnvIndex] = useState(0);
  const [apiUrl, setApiUrl] = useState<string>(API_ENVIRONMENTS[0]!.apiUrl);
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadConfig().then((config) => {
      if (cancelled) return;
      const env = environmentForApiUrl(config.apiUrl);
      setApiUrl(env.apiUrl);
      setEnvIndex(API_ENVIRONMENTS.findIndex((item) => item.id === env.id));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useInput((input, key) => {
    if (key.escape || input === 'q') onQuit();
    if (key.upArrow || input === 'k') {
      setEnvIndex((value) => (value - 1 + API_ENVIRONMENTS.length) % API_ENVIRONMENTS.length);
    }
    if (key.downArrow || input === 'j') {
      setEnvIndex((value) => (value + 1) % API_ENVIRONMENTS.length);
    }
    if (key.return) {
      const selected = API_ENVIRONMENTS[envIndex]!;
      setApiUrl(selected.apiUrl);
      setError(null);
      setDevice(null);
      setPhase('device');
    }
  }, { isActive: phase === 'env' && ready });

  useInput((input, key) => {
    if (key.escape || input === 'q') onQuit();
    if (input === 't') setPhase('token');
    if (input === 'e') {
      setDevice(null);
      setError(null);
      setBusy(false);
      setPhase('env');
    }
  }, { isActive: phase === 'device' });

  useInput((_, key) => {
    if (key.escape) setPhase('device');
  }, { isActive: phase === 'token' });

  useEffect(() => {
    if (phase !== 'device') return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    setDevice(null);
    void (async () => {
      try {
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
  }, [phase, apiUrl, onLoggedIn]);

  const selectedEnv = API_ENVIRONMENTS[envIndex]!;

  let body;
  if (phase === 'env') {
    body = (
      <Box flexDirection="column">
        {!ready ? <Spinner label="Cargando…" /> : null}
        {ready
          ? API_ENVIRONMENTS.map((item, index) => {
              const selected = index === envIndex;
              return (
                <Box key={item.id} marginBottom={1}>
                  <Text color={selected ? colors.accent : colors.muted}>
                    {selected ? '› ' : '  '}
                  </Text>
                  <Box flexDirection="column">
                    <Text bold color={selected ? colors.white : colors.ink}>
                      {item.label}
                    </Text>
                    <Text color={colors.muted}>{item.description}</Text>
                  </Box>
                </Box>
              );
            })
          : null}
      </Box>
    );
  } else if (phase === 'token') {
    body = (
      <Box flexDirection="column">
        <Text color={colors.muted}>Pega tu PAT de Klarify</Text>
        <Text color={colors.faint}>{apiUrl}</Text>
        <Box marginTop={1} width={Math.min(48, columns - 10)}>
          <TextInput
            placeholder="klf_…"
            onSubmit={(value) => {
              void (async () => {
                try {
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
    );
  } else {
    body = (
      <Box flexDirection="column">
        <Text color={colors.faint}>{apiUrl}</Text>
        {busy && !device ? <Spinner label="Pidiendo código…" /> : null}
        {device ? (
          <>
            <Box marginTop={1}>
              <Text bold color={colors.white}>
                {spacedCode(device.userCode)}
              </Text>
            </Box>
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
  }

  const title =
    phase === 'env' ? 'Elegir entorno' : phase === 'token' ? 'Token de acceso' : 'Iniciar sesión';
  const meta =
    phase === 'env'
      ? 'Cloud es lo normal. Local solo si desarrollas Klarify.'
      : phase === 'token'
        ? 'El token se guarda en ~/.klarify/config.json'
        : 'Autoriza este dispositivo para entrar al workspace.';

  return (
    <Landing
      columns={columns}
      rows={rows}
      title={title}
      meta={meta}
      error={error}
      showPath={false}
      hints={
        phase === 'env' ? (
          <Hints items={[['j/k', 'mover'], ['enter', 'seguir'], ['q', 'salir']]} />
        ) : phase === 'token' ? (
          <Hints items={[['enter', 'guardar'], ['esc', 'código']]} />
        ) : (
          <Hints items={[['t', 'PAT'], ['e', 'entorno'], ['q', 'salir']]} />
        )
      }
      tip={
        phase === 'token' ? (
          <Tip>Los agentes también pueden usar klarify login --token</Tip>
        ) : phase === 'env' ? (
          <Tip>
            {selectedEnv.id === 'prod'
              ? 'Recomendado: tu cuenta en klarify.vercel.app'
              : 'Solo si corres Next en :3000'}
          </Tip>
        ) : undefined
      }
    >
      {body}
    </Landing>
  );
}
