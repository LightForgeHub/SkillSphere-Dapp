//! Pluggable storage backend for the indexer.
//!
//! Production deployments wire a Postgres or Redis impl. The MVP ships
//! `MemoryStore` so the binary can boot, the tests have a target, and
//! GraphQL resolvers (#212) have something to read.

use std::collections::HashMap;
use std::sync::Mutex;

use crate::event_types::RawEvent;

pub trait Store: Send + Sync {
    fn write_event(&self, ev: &RawEvent) -> Result<(), String>;
    fn last_indexed_ledger(&self) -> Option<u32>;
    fn set_last_indexed_ledger(&self, ledger: u32) -> Result<(), String>;
    fn count_events(&self) -> usize;
    fn user_sessions(&self, _user: &str) -> Vec<RawEvent>;
    fn expert_ratings(&self, _expert: &str) -> Vec<RawEvent>;
    fn platform_stats(&self) -> Option<PlatformStatsSnapshot>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlatformStatsSnapshot {
    pub total_sessions: u64,
    pub total_volume: i128,
    pub recorded_at: u64,
}

#[derive(Default)]
pub struct MemoryStore {
    state: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    events: Vec<RawEvent>,
    last_ledger: Option<u32>,
    platform_stats: Option<PlatformStatsSnapshot>,
    by_user: HashMap<String, Vec<usize>>,
    by_expert_rating: HashMap<String, Vec<usize>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        Self::default()
    }
}

impl Store for MemoryStore {
    fn write_event(&self, ev: &RawEvent) -> Result<(), String> {
        let mut s = self.state.lock().map_err(|e| e.to_string())?;
        s.events.push(ev.clone());
        Ok(())
    }

    fn last_indexed_ledger(&self) -> Option<u32> {
        self.state.lock().ok().and_then(|s| s.last_ledger)
    }

    fn set_last_indexed_ledger(&self, ledger: u32) -> Result<(), String> {
        let mut s = self.state.lock().map_err(|e| e.to_string())?;
        s.last_ledger = Some(ledger);
        Ok(())
    }

    fn count_events(&self) -> usize {
        self.state.lock().map(|s| s.events.len()).unwrap_or(0)
    }

    fn user_sessions(&self, user: &str) -> Vec<RawEvent> {
        let s = match self.state.lock() {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        s.by_user
            .get(user)
            .map(|ixs| ixs.iter().filter_map(|i| s.events.get(*i).cloned()).collect())
            .unwrap_or_default()
    }

    fn expert_ratings(&self, expert: &str) -> Vec<RawEvent> {
        let s = match self.state.lock() {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        s.by_expert_rating
            .get(expert)
            .map(|ixs| ixs.iter().filter_map(|i| s.events.get(*i).cloned()).collect())
            .unwrap_or_default()
    }

    fn platform_stats(&self) -> Option<PlatformStatsSnapshot> {
        self.state.lock().ok().and_then(|s| s.platform_stats.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event_types::EventKind;

    #[test]
    fn memory_store_writes_and_reads_cursor() {
        let s = MemoryStore::new();
        assert!(s.last_indexed_ledger().is_none());
        s.set_last_indexed_ledger(7).unwrap();
        assert_eq!(s.last_indexed_ledger(), Some(7));
    }

    #[test]
    fn memory_store_counts_events() {
        let s = MemoryStore::new();
        s.write_event(&RawEvent {
            kind: EventKind::SessionSettled,
            tx_hash: "x".into(),
            ledger_seq: 1,
            timestamp: 1,
            xdr_payload: vec![],
        })
        .unwrap();
        assert_eq!(s.count_events(), 1);
    }
}
