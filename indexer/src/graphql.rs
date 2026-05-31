//! GraphQL surface scaffolding (#212).
//!
//! Defines the schema + resolver traits the dapp frontend consumes:
//! `UserSessions`, `ExpertRatings`, `PlatformStats`. The MVP keeps the
//! transport layer out of scope so the crate doesn't pull a 30+MB
//! `async-graphql` dependency tree on every build. The production
//! follow-up wires `async-graphql` + `axum` and binds `cfg.graphql_bind`.

use crate::store::{PlatformStatsSnapshot, Store};

/// SDL definition the production server will publish at `/schema.gql`.
/// Kept inline so the wire shape is reviewable here even while the
/// HTTP layer is deferred.
pub const SCHEMA_SDL: &str = r#"
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
"#;

/// Lightweight resolver layer over the storage backend. The MVP
/// returns event counts; the production follow-up adds the full
/// projection from `RawEvent` to typed objects.
pub struct Resolvers<'a> {
    pub store: &'a dyn Store,
}

impl<'a> Resolvers<'a> {
    pub fn user_session_count(&self, user_id: &str) -> usize {
        self.store.user_sessions(user_id).len()
    }

    pub fn expert_rating_count(&self, expert_id: &str) -> usize {
        self.store.expert_ratings(expert_id).len()
    }

    pub fn platform_stats(&self) -> Option<PlatformStatsSnapshot> {
        self.store.platform_stats()
    }

    /// Project the lazy resolvers into a single `Snapshot` payload for
    /// the future GraphQL `Query.platformStats` response.
    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            platform_stats: self.platform_stats(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Snapshot {
    pub platform_stats: Option<PlatformStatsSnapshot>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::MemoryStore;

    #[test]
    fn schema_sdl_has_top_level_query() {
        assert!(SCHEMA_SDL.contains("type Query"));
        assert!(SCHEMA_SDL.contains("userSessions"));
        assert!(SCHEMA_SDL.contains("expertRatings"));
        assert!(SCHEMA_SDL.contains("platformStats"));
    }

    #[test]
    fn resolvers_return_zero_counts_for_unknown_user() {
        let s = MemoryStore::new();
        let r = Resolvers { store: &s };
        assert_eq!(r.user_session_count("nobody"), 0);
        assert_eq!(r.expert_rating_count("nobody"), 0);
        assert!(r.snapshot().platform_stats.is_none());
    }
}
