//! Polling event listener (#211).
//!
//! The MVP listener pulls events from a `SorobanRpcClient` trait. The
//! trait keeps the polling loop test-friendly — production deployments
//! plug in `stellar-rpc-client::Client` (or the rust-stellar-sdk
//! equivalent) and the loop is unchanged.

use std::time::Duration;

use crate::event_types::{EventKind, RawEvent};
use crate::store::Store;

#[derive(Debug, Clone)]
pub struct ListenerConfig {
    pub contract_id: String,
    pub rpc_url: String,
    pub poll_interval: Duration,
    pub event_kinds: Vec<EventKind>,
}

/// Abstraction over the Soroban RPC `getEvents` call. Production
/// implementations: `stellar-rpc-client`, or a thin reqwest wrapper.
pub trait SorobanRpcClient {
    fn fetch_events(
        &self,
        contract_id: &str,
        from_ledger: u32,
        kinds: &[EventKind],
    ) -> Result<Vec<RawEvent>, String>;

    fn latest_ledger(&self) -> Result<u32, String>;
}

/// In-memory stub for tests and the no-network MVP build. The real
/// client implementing `SorobanRpcClient` is left for the production
/// follow-up; the stub returns no events but lets the loop tick.
pub struct StubRpcClient {
    pub next_ledger: u32,
}

impl SorobanRpcClient for StubRpcClient {
    fn fetch_events(
        &self,
        _contract_id: &str,
        _from_ledger: u32,
        _kinds: &[EventKind],
    ) -> Result<Vec<RawEvent>, String> {
        Ok(Vec::new())
    }
    fn latest_ledger(&self) -> Result<u32, String> {
        Ok(self.next_ledger)
    }
}

pub struct Listener {
    cfg: ListenerConfig,
    store: Box<dyn Store>,
    rpc: Box<dyn SorobanRpcClient>,
}

impl Listener {
    pub fn new(cfg: ListenerConfig, store: Box<dyn Store>) -> Self {
        Self {
            cfg,
            store,
            rpc: Box::new(StubRpcClient { next_ledger: 0 }),
        }
    }

    pub fn with_rpc(mut self, rpc: Box<dyn SorobanRpcClient>) -> Self {
        self.rpc = rpc;
        self
    }

    /// Drive a single poll tick. Useful for tests and for the bin
    /// (`run_blocking` calls it in a loop with a sleep).
    pub fn tick(&mut self) -> Result<usize, String> {
        let from_ledger = self.store.last_indexed_ledger().unwrap_or(0);
        let events = self
            .rpc
            .fetch_events(&self.cfg.contract_id, from_ledger, &self.cfg.event_kinds)?;
        let count = events.len();
        for ev in &events {
            self.store.write_event(ev)?;
        }
        if let Some(top) = events.iter().map(|e| e.ledger_seq).max() {
            self.store.set_last_indexed_ledger(top)?;
        }
        Ok(count)
    }

    pub fn run_blocking(mut self) -> Result<(), String> {
        loop {
            match self.tick() {
                Ok(n) if n > 0 => eprintln!("[listener] indexed {n} events"),
                Ok(_) => {}
                Err(e) => eprintln!("[listener] tick error: {e}"),
            }
            std::thread::sleep(self.cfg.poll_interval);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event_types::EventKind;
    use crate::store::MemoryStore;

    struct CannedRpc(Vec<RawEvent>);
    impl SorobanRpcClient for CannedRpc {
        fn fetch_events(
            &self,
            _c: &str,
            _from: u32,
            _kinds: &[EventKind],
        ) -> Result<Vec<RawEvent>, String> {
            Ok(self.0.clone())
        }
        fn latest_ledger(&self) -> Result<u32, String> {
            Ok(self.0.iter().map(|e| e.ledger_seq).max().unwrap_or(0))
        }
    }

    #[test]
    fn tick_persists_events_and_advances_cursor() {
        let events = vec![
            RawEvent {
                kind: EventKind::SessionSettled,
                tx_hash: "tx1".into(),
                ledger_seq: 42,
                timestamp: 100,
                xdr_payload: vec![1, 2, 3],
            },
            RawEvent {
                kind: EventKind::PlatformStats,
                tx_hash: "tx2".into(),
                ledger_seq: 43,
                timestamp: 200,
                xdr_payload: vec![4],
            },
        ];
        let cfg = ListenerConfig {
            contract_id: "C".into(),
            rpc_url: "x".into(),
            poll_interval: Duration::from_millis(1),
            event_kinds: EventKind::all_known(),
        };
        let mut listener = Listener::new(cfg, Box::new(MemoryStore::new()))
            .with_rpc(Box::new(CannedRpc(events)));
        let n = listener.tick().unwrap();
        assert_eq!(n, 2);
        assert_eq!(listener.store.last_indexed_ledger().unwrap(), 43);
        assert_eq!(listener.store.count_events(), 2);
    }
}
