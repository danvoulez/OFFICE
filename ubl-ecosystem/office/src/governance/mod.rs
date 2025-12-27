//! Governance Module
//!
//! Psychological governance for LLM entities:
//! - Sanity Check: Validates claims against facts
//! - Constitution: Behavioral directives
//! - Dreaming Cycle: Memory consolidation
//! - Simulation: Safety net for actions

mod sanity_check;
mod constitution;
mod dreaming;
mod simulation;

pub use sanity_check::{SanityCheck, SanityCheckConfig, Claim, Fact, Discrepancy, GovernanceNote};
pub use constitution::{Constitution, BehavioralOverride, ConstitutionBuilder};
pub use dreaming::{DreamingCycle, DreamingConfig, DreamingResult};
pub use simulation::{Simulation, SimulationConfig, SimulationResult, ActionOutcome, ActionRecommendation, Action};
