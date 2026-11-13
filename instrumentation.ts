export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Fire-and-forget anonymous install heartbeat (license metrics + control plane).
  try {
    const { maybeSendHeartbeat } = await import('@/lib/telemetry/heartbeat');
    void maybeSendHeartbeat('boot');
  } catch (error) {
    console.warn('[telemetry] boot heartbeat skipped', error);
  }
}
