# FreeJoy runtime contract

FreeJoy exposes a same-origin HTTP endpoint and a Socket.IO protocol. The host and controllers use separate bearer capabilities; neither role inherits the other role's authority.

## Capability transport

The server reads `FREEJOY_HOST_TOKEN` and `FREEJOY_JOIN_TOKEN`, or generates independent random values at startup. Configured values must be different. The bundled application receives them in URL fragments:

- host: `/#host=<host capability>`;
- controller: `/pad#room=<room ID>&join=<join capability>`.

Fragments are available to the application but are not included in the initial HTTP request. Each Socket.IO connection sends `{ role, token }` in handshake `auth`.

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

`clientId`, `socketId`, and activity timestamps are internal and never appear in this response. Missing or invalid authority returns HTTP 403 with `HOST_AUTH_REQUIRED`.

## Controller socket

Handshake auth:

```json
{ "role": "player", "token": "<join capability>" }
```

### Client events

- `join { roomId, clientId, deviceName? }`
- `input { btn, state }`
- `analog { stick, x, y }`
- `ping`

The room ID is eight hexadecimal characters. The bundled client creates a persistent, high-entropy `pro-` identifier with 128 random bits; a second socket cannot take over that identifier while its owner is connected. Device names contain at most 80 display characters. Buttons are allow-listed, state is exactly `0` or `1`, analog values must be finite and are clamped to `[-1, 1]`. Input and analog events share a configurable per-socket rate ceiling. Exceeding it releases the controller, removes its session, and disconnects the socket instead of dropping a potentially safety-critical release event.

### Server events

- `joined { playerId, roomId, profile }`
- `pong`
- `kicked { reason }`
- `operation_error { code, message }`

An invalid room produces `ROOM_CLOSED` without returning or redirecting to the active room identifier.
The bundled controller renews its lease every ten seconds. A controller that stops renewing for thirty seconds is neutralized and disconnected even if its transport has not reported a clean close.

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
- `room_reset_complete`;
- `operation_error { code, message }`.

Player sockets that attempt host operations receive `HOST_AUTH_REQUIRED`. Invalid handshake capabilities receive `AUTH_REQUIRED` and are disconnected.

`kick_player` blocks the bundled client's stored controller identity until `reset_room`. It is session moderation, not revocation of the shared join capability: an operator who needs to revoke the QR code must change `FREEJOY_JOIN_TOKEN` and restart the server.

## Lifecycle guarantee

Each successful join activates one controller lifecycle. FreeJoy sends at most one `releasePlayer` for that activation when it ends through disconnect, kick, reset, stale cleanup, or server shutdown. A later reconnect starts a new activation. The Python boundary resets a controller before removing it and also resets any remaining controllers when stdin closes.
