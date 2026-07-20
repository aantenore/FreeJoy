# FreeJoy runtime contract

FreeJoy exposes a same-origin HTTP endpoint and a Socket.IO protocol. The host and controllers use separate bearer capabilities; neither role inherits the other role's authority.

## Capability transport

The server reads `FREEJOY_HOST_TOKEN` and `FREEJOY_JOIN_TOKEN`, or generates independent random values at startup. Configured values must be different. The bundled application receives them in URL fragments:

- host: `/#host=<host capability>`;
- controller: `/pad#room=<room ID>&join=<join capability>`.

Fragments are available to the application but are not included in the initial HTTP request. Process logs never contain either capability. Each new controller sends `{ role: "player", capability: "join", token }` in handshake `auth`; after assignment it uses the opaque reconnect capability issued by the server instead.

## HTTP

### `GET /api/room`

Requires `Authorization: Bearer <host capability>` and responds with `Cache-Control: no-store`.

```json
{
  "roomId": "ABCDEF12",
  "serverIp": "192.0.2.10",
  "joinUrl": "http://192.0.2.10:3000/pad#room=ABCDEF12&join=...",
  "maxPlayers": 4,
  "players": [
    { "playerId": 1, "connected": true, "deviceName": "Phone" }
  ]
}
```

Reconnect capability digests, `socketId`, and activity timestamps are internal and never appear in this response. Missing or invalid authority returns HTTP 403 with `HOST_AUTH_REQUIRED`.

## Controller socket

First-join handshake auth:

```json
{ "role": "player", "capability": "join", "token": "<join capability>" }
```

Reconnect handshake auth:

```json
{ "role": "player", "capability": "reconnect", "token": "<server-issued capability>" }
```

### Client events

- `join { roomId, deviceName? }`
- `input { btn, state }`
- `analog { stick, x, y }`
- `ping`

The room ID is eight hexadecimal characters. Device names contain at most 80 display characters. The server issues a 256-bit reconnect capability, stores only its digest, and never exposes it to the host or another controller. Buttons are allow-listed, state is exactly `0` or `1`, analog values must be finite and are clamped to `[-1, 1]`. Input and analog events share a configurable per-controller rate ceiling whose state survives reconnects. Exceeding it neutralizes and disconnects the controller instead of dropping a potentially safety-critical release event.

### Server events

- `joined { playerId, roomId, profile, reconnectToken, leaseMs }`
- `pong`
- `kicked { reason }`
- `operation_error { code, message }`

An invalid room produces `ROOM_CLOSED` without returning or redirecting to the active room identifier.
The bundled controller derives its heartbeat from `leaseMs`. `IDENTITY_BUSY` includes an authoritative `retryAfterMs`; the client keeps retrying through the entire old lease. An unresponsive live controller is neutralized first and its reconnect record is retained for one additional grace period before removal.

## Host socket

Handshake auth:

```json
{ "role": "host", "token": "<host capability>" }
```

### Client events

- `get_players`
- `kick_player { playerId }`
- `reset_room`

### Server events

- `players_list` with redacted public players;
- `room_state` with `players` and `maxPlayers` only;
- `join_capability_rotated` when the host must refresh its QR code;
- `room_reset_complete`;
- `operation_error { code, message }`.

Player sockets that attempt host operations receive `HOST_AUTH_REQUIRED`. Invalid handshake capabilities receive `AUTH_REQUIRED` and are disconnected.

`kick_player` revokes the player's reconnect capability and rotates the shared join capability. The authorized host receives `join_capability_rotated` and refreshes the QR code; existing players continue to use their individual reconnect capabilities.

## Lifecycle guarantee

Each successful join activates one controller lifecycle. FreeJoy sends at most one `releasePlayer` for that activation when it ends through disconnect, kick, reset, stale cleanup, or server shutdown. A later reconnect starts a new activation. The Python boundary resets a controller before removing it and also resets any remaining controllers when stdin closes.
