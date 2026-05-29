# SkillSphere Indexer (#211 + #212)

Polling event listener + GraphQL surface for the SkillSphere Soroban
contract. Sits between the on-chain contract and the dapp frontend so
the UI can query indexed projections (`UserSessions`, `ExpertRatings`,
`PlatformStats`) instead of hitting Soroban RPC on every render.

## What's in this MVP

- **`src/listener.rs`** — `Listener::run_blocking()` poll loop with a
  pluggable `SorobanRpcClient` trait. Production deployments wire
  `stellar-rpc-client` (or rust-stellar-sdk) here; tests use the
  in-file `StubRpcClient` / `CannedRpc`.
- **`src/store.rs`** — `Store` trait + `MemoryStore` impl. Production
  deployments add `PostgresStore` / `RedisStore` behind the same
  trait. Cursor tracking (`last_indexed_ledger`) lives here.
- **`src/event_types.rs`** — `EventKind` mirrors every event the
  contract publishes today (session lifecycle, dispute flagging,
  PlatformStats #200, FeeBurn #213, staking #214).
- **`src/graphql.rs`** — `SCHEMA_SDL` is the exact GraphQL schema the
  frontend will consume. `Resolvers` is a thin layer over the storage
  backend; production wires `async-graphql` + `axum` and routes
  `cfg.graphql_bind`.
- **Tests**: listener tick persists events + advances cursor;
  MemoryStore writes + reads cursor; resolvers return zero counts for
  unknown users; schema includes all three top-level queries.

## What's deferred to a follow-up

- **Real `SorobanRpcClient`** that hits Soroban RPC's `getEvents` and
  decodes XDR topic+data tuples. Sketch in `listener.rs` shows the
  exact integration shape; behind the trait so the loop never changes.
- **Postgres / Redis Stores**. The `Store` trait is the seam.
- **`async-graphql` + `axum` HTTP transport** binding `graphql_bind`.
  The schema + resolver layer are already in place; only the wire
  layer is deferred.
- **Tokio runtime** for concurrent poll + HTTP serving. The MVP uses
  `std::thread::sleep` to keep dependencies at zero so the crate
  compiles cleanly in the existing Soroban + Cargo workspace.

Splitting that way keeps the new crate's footprint small while landing
the structure, types, and schema reviewers care about.

## Configuration

```sh
SKILLSPHERE_CONTRACT_ID=C...        # required
SOROBAN_RPC_URL=https://...         # default: soroban-testnet
INDEXER_POLL_INTERVAL_MS=5000       # default
INDEXER_GRAPHQL_BIND=0.0.0.0:8080   # default
```

## Run

```sh
cargo run -p skillsphere-indexer
```

## GraphQL schema (SDL)

```graphql
type Query {
  userSessions(userId: String!, limit: Int): [Session!]!
  expertRatings(expertId: String!, limit: Int): [Rating!]!
  platformStats: PlatformStats
}

type Session {
  id: String!
  seeker: String!
  expert: String!
  startedAt: Int!
  status: String!
}

type Rating {
  sessionId: String!
  rater: String!
  score: Int!
  createdAt: Int!
}

type PlatformStats {
  totalSessions: Int!
  totalVolume: String!
  recordedAt: Int!
}
```
