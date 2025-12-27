//! Entity Management Module
//!
//! Manages LLM entities - persistent identities that spawn ephemeral instances.

mod entity;
mod instance;
mod identity;
mod guardian;

pub use entity::{Entity, EntityId, EntityParams, EntityType, EntityStatus};
pub use instance::{Instance, InstanceId, InstanceStatus};
pub use identity::{Identity, KeyPair};
pub use guardian::{Guardian, GuardianId};
