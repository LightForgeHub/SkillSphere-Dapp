//! SkillSphere indexer (#211 + #212).
//!
//! Polls Soroban RPC for SkillSphere contract events and pushes them
//! into a pluggable store (Postgres, Redis, or in-memory for tests).
//! Exposes a small GraphQL surface (#212) so the dapp frontend can read
//! indexed `UserSessions`, `ExpertRatings`, and `PlatformStats` without
//! talking to the contract directly.
//!
//! Run with:
//!
//! ```sh
//! cargo run --bin skillsphere-indexer
//! ```
//!
//! Configuration is sourced from env vars (see `Config::from_env`).

mod event_types;
mod graphql;
mod listener;
mod store;

use std::process::ExitCode;
use std::time::Duration;

use event_types::EventKind;
use listener::{Listener, ListenerConfig};
use store::{MemoryStore, Store};

#[derive(Debug, Clone)]
pub struct Config {
    pub contract_id: String,
    pub rpc_url: String,
    pub poll_interval_ms: u64,
    pub graphql_bind: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            contract_id: std::env::var("SKILLSPHERE_CONTRACT_ID")
                .map_err(|_| "SKILLSPHERE_CONTRACT_ID unset".to_string())?,
            rpc_url: std::env::var("SOROBAN_RPC_URL")
                .unwrap_or_else(|_| "https://soroban-testnet.stellar.org".to_string()),
            poll_interval_ms: std::env::var("INDEXER_POLL_INTERVAL_MS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5_000),
            graphql_bind: std::env::var("INDEXER_GRAPHQL_BIND")
                .unwrap_or_else(|_| "0.0.0.0:8080".to_string()),
        })
    }
}

fn main() -> ExitCode {
    let cfg = match Config::from_env() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[indexer] config error: {e}");
            return ExitCode::FAILURE;
        }
    };

    eprintln!(
        "[indexer] starting; contract={} rpc={} poll={}ms graphql={}",
        cfg.contract_id, cfg.rpc_url, cfg.poll_interval_ms, cfg.graphql_bind,
    );

    let store: Box<dyn Store> = Box::new(MemoryStore::new());
    let listener_cfg = ListenerConfig {
        contract_id: cfg.contract_id.clone(),
        rpc_url: cfg.rpc_url.clone(),
        poll_interval: Duration::from_millis(cfg.poll_interval_ms),
        event_kinds: EventKind::all_known(),
    };
    let listener = Listener::new(listener_cfg, store);

    // In an MVP (no tokio), run a blocking poll loop. Production
    // builds wire `tokio::spawn` and `actix-web` / `axum` here.
    if let Err(e) = listener.run_blocking() {
        eprintln!("[indexer] listener exited with error: {e}");
        return ExitCode::FAILURE;
    }

    ExitCode::SUCCESS
}
