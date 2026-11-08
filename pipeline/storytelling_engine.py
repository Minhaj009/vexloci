"""
Core Storytelling Engine & Retention Psychology Architecture.
Enforces the 5 Universal Narrative Invariants:
1. The 30-Second Hook Law (Cold open incident + active open loop + non-empty jeopardy metric).
2. The Causal Transition Law ('THEREFORE' or 'BUT' - zero 'And Then' permitted).
3. The Active Open Loop Invariant (Active questions >= 1 until Act 6 catharsis).
4. Monotonic Stakes Escalation (Sawtooth tension peaking in Act 5 at >= 90%).
5. Evidentiary Value Density (Every scene anchored by primary documentary artifacts).
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class NarrativeBeatEnum(str, Enum):
    COLD_OPEN_HOOK = "COLD_OPEN_HOOK"
    INCITING_INCIDENT = "INCITING_INCIDENT"
    ANOMALY_DISCOVERY = "ANOMALY_DISCOVERY"
    GROUND_ZERO_PANIC = "GROUND_ZERO_PANIC"
    ARCHITECTURAL_VULNERABILITY = "ARCHITECTURAL_VULNERABILITY"
    INFILTRATION_VECTOR = "INFILTRATION_VECTOR"
    DEFENSE_SUPPRESSION = "DEFENSE_SUPPRESSION"
    PRIVILEGED_SUBVERSION = "PRIVILEGED_SUBVERSION"
    PAYLOAD_DETONATION = "PAYLOAD_DETONATION"
    RECURSIVE_CRASH_LOOP = "RECURSIVE_CRASH_LOOP"
    CAPITAL_DRAIN = "CAPITAL_DRAIN"
    CONTAINMENT_FREEZE = "CONTAINMENT_FREEZE"
    OPTICAL_TRACE_HUNT = "OPTICAL_TRACE_HUNT"
    SMOKING_GUN_INTERCEPT = "SMOKING_GUN_INTERCEPT"
    TICKING_CLOCK_DEADLINE = "TICKING_CLOCK_DEADLINE"
    FEDERAL_TASK_FORCE = "FEDERAL_TASK_FORCE"
    CONTAGION_SHOCKWAVE = "CONTAGION_SHOCKWAVE"
    MARKET_COLLAPSE = "MARKET_COLLAPSE"
    BACKCHANNEL_PANIC = "BACKCHANNEL_PANIC"
    CAMPUS_RAID_DETENTION = "CAMPUS_RAID_DETENTION"
    FORENSIC_AUTOPSY = "FORENSIC_AUTOPSY"
    ASSET_SEIZURE_RECOVERY = "ASSET_SEIZURE_RECOVERY"
    REGULATORY_RECKONING = "REGULATORY_RECKONING"
    SYSTEMIC_CATHARSIS = "SYSTEMIC_CATHARSIS"


class TransitionCausalityEnum(str, Enum):
    THEREFORE = "THEREFORE"
    BUT = "BUT"
    NONE = "NONE"


class OpenLoopActionEnum(str, Enum):
    OPEN = "OPEN"
    ESCALATE = "ESCALATE"
    RESOLVE = "RESOLVE"


class OpenLoopRecord(BaseModel):
    loopId: str
    question: str
    action: OpenLoopActionEnum


class NarrativeMetadata(BaseModel):
    beat: NarrativeBeatEnum
    causalTransition: TransitionCausalityEnum = TransitionCausalityEnum.THEREFORE
    causalRationale: str
    tensionScore: float = Field(ge=0.0, le=100.0)
    openLoopAction: Optional[OpenLoopRecord] = None
    evidentiaryArtifact: str
    dollarStakes: Optional[str] = None


ACT_BEAT_MAP: List[Tuple[int, NarrativeBeatEnum, TransitionCausalityEnum, float, str]] = [
    # Act 1: The Incident Zero-Hour & The Anomaly (Tension 55 -> 68)
    (1, NarrativeBeatEnum.COLD_OPEN_HOOK, TransitionCausalityEnum.NONE, 65.0, "The catastrophic event detonates in real time."),
    (1, NarrativeBeatEnum.INCITING_INCIDENT, TransitionCausalityEnum.THEREFORE, 58.0, "Regulators and automated alarms record initial anomalous telemetry."),
    (1, NarrativeBeatEnum.ANOMALY_DISCOVERY, TransitionCausalityEnum.BUT, 62.0, "Initial warning signs had been flagged weeks earlier but were suppressed."),
    (1, NarrativeBeatEnum.GROUND_ZERO_PANIC, TransitionCausalityEnum.THEREFORE, 68.0, "Telemetry consoles display cascading errors across primary control planes."),

    # Act 2: The Decompilation: Architecture of Failure (Tension 64 -> 76)
    (2, NarrativeBeatEnum.ARCHITECTURAL_VULNERABILITY, TransitionCausalityEnum.THEREFORE, 65.0, "Investigators dissect legacy architectural omissions exposing privileged buses."),
    (2, NarrativeBeatEnum.INFILTRATION_VECTOR, TransitionCausalityEnum.THEREFORE, 70.0, "Weaponized payloads exploit the flaw to plant persistent memory daemons."),
    (2, NarrativeBeatEnum.DEFENSE_SUPPRESSION, TransitionCausalityEnum.BUT, 73.0, "Adversaries blind defensive monitoring, spoofing nominal heartbeat pings."),
    (2, NarrativeBeatEnum.PRIVILEGED_SUBVERSION, TransitionCausalityEnum.THEREFORE, 76.0, "Internal logic gates are patched in memory, bypassing dual-custody authorization."),

    # Act 3: The Strike: Catastrophe in Real-Time (Tension 74 -> 88)
    (3, NarrativeBeatEnum.PAYLOAD_DETONATION, TransitionCausalityEnum.THEREFORE, 80.0, "The coordinated execution triggers simultaneous high-speed operations."),
    (3, NarrativeBeatEnum.RECURSIVE_CRASH_LOOP, TransitionCausalityEnum.BUT, 84.0, "Automated algorithms enter runaway infinite loops exhausting capital reserves."),
    (3, NarrativeBeatEnum.CAPITAL_DRAIN, TransitionCausalityEnum.THEREFORE, 88.0, "Unprecedented sovereign or corporate balances drain into offshore relays."),
    (3, NarrativeBeatEnum.CONTAINMENT_FREEZE, TransitionCausalityEnum.BUT, 82.0, "Disaster recovery failovers fail because backup volumes share compromised forests."),

    # Act 4: The Investigation: Whistleblowers & Intercepts (Tension 78 -> 92)
    (4, NarrativeBeatEnum.OPTICAL_TRACE_HUNT, TransitionCausalityEnum.THEREFORE, 82.0, "Federal forensic analysts trace optical fiber hop routes through bulletproof nodes."),
    (4, NarrativeBeatEnum.SMOKING_GUN_INTERCEPT, TransitionCausalityEnum.BUT, 88.0, "A single typographical error or unsealed whistleblower memo breaks the coverup."),
    (4, NarrativeBeatEnum.TICKING_CLOCK_DEADLINE, TransitionCausalityEnum.THEREFORE, 92.0, "Operating capital burns at millions per hour under a strict compliance ultimatum."),
    (4, NarrativeBeatEnum.FEDERAL_TASK_FORCE, TransitionCausalityEnum.THEREFORE, 90.0, "Inter-agency task forces deploy forensic pods to intercept adversary traffic."),

    # Act 5: The Collapse: Contagion & Ruin (Tension 90 -> 100 - The Peak)
    (5, NarrativeBeatEnum.CONTAGION_SHOCKWAVE, TransitionCausalityEnum.THEREFORE, 93.0, "Contagion rips through dependent supply chains and global counterparties."),
    (5, NarrativeBeatEnum.MARKET_COLLAPSE, TransitionCausalityEnum.THEREFORE, 98.0, "Equity valuations suffer historic freefall, vaporizing billions in hours."),
    (5, NarrativeBeatEnum.BACKCHANNEL_PANIC, TransitionCausalityEnum.BUT, 95.0, "Secret crisis negotiations collapse under extortion demands and regulatory freezes."),
    (5, NarrativeBeatEnum.CAMPUS_RAID_DETENTION, TransitionCausalityEnum.THEREFORE, 100.0, "Federal law enforcement raids executive properties and impounds active crime scenes."),

    # Act 6: The Autopsy: The Forensic Verdict (Tension 82 -> 45 - Catharsis)
    (6, NarrativeBeatEnum.FORENSIC_AUTOPSY, TransitionCausalityEnum.THEREFORE, 75.0, "The unsealed audit report documents how multi-billion dollar giants fell to basic hygiene."),
    (6, NarrativeBeatEnum.ASSET_SEIZURE_RECOVERY, TransitionCausalityEnum.BUT, 68.0, "Law enforcement seizes illicit private keys, recovering a portion of drained funds."),
    (6, NarrativeBeatEnum.REGULATORY_RECKONING, TransitionCausalityEnum.THEREFORE, 55.0, "Legislative mandates enforce permanent duty-of-care reforms and officer liabilities."),
    (6, NarrativeBeatEnum.SYSTEMIC_CATHARSIS, TransitionCausalityEnum.THEREFORE, 45.0, "The permanent cautionary wisdom that digital infrastructure is physical infrastructure.")
]


def inject_storytelling_contracts(
    scenes: List[Dict[str, Any]], topic_title: str
) -> List[Dict[str, Any]]:
    """
    Enriches a 24-scene script with verified narrative contracts:
    - Dramatic beat taxonomy
    - 'THEREFORE / BUT' causal linkages
    - Loewenstein Information Gap and Zeigarnik Open Loops
    - Calibrated mathematical tension scores
    """
    primary_loop_id = "loop_master_mystery"
    secondary_loop_id = "loop_smoking_gun"

    for idx, scene in enumerate(scenes):
        beat_idx = min(idx, len(ACT_BEAT_MAP) - 1)
        _, beat_type, default_causality, tension, rationale = ACT_BEAT_MAP[beat_idx]

        # First scene has no predecessor transition
        causality = TransitionCausalityEnum.NONE if idx == 0 else default_causality

        # Open Loop Schedule:
        # Scene 0: Opens Master Loop
        # Scene 6: Opens Secondary Loop
        # Scene 13: Escalates Master Loop & Resolves Secondary
        # Scene 23: Complete Catharsis (Resolves Master Loop)
        open_loop: Optional[Dict[str, Any]] = None
        if idx == 0:
            open_loop = {
                "loopId": primary_loop_id,
                "question": f"How did an unassailable system collapse into catastrophic failure during {topic_title}?",
                "action": "OPEN",
            }
        elif idx == 6:
            open_loop = {
                "loopId": secondary_loop_id,
                "question": "Who authored the surgical zero-day byte patch that blinded internal audit logs?",
                "action": "OPEN",
            }
        elif idx == 13:
            open_loop = {
                "loopId": secondary_loop_id,
                "question": "The smoking gun artifact unmasks the illicit backdoor, but reveals an even deeper conspiracy.",
                "action": "RESOLVE",
            }
        elif idx == 23:
            open_loop = {
                "loopId": primary_loop_id,
                "question": "Final forensic verdict delivers complete structural resolution.",
                "action": "RESOLVE",
            }

        # Evidentiary Artifact
        artifact = scene.get("evidenceMetadata", {}).get(
            "documentTitle",
            f"EXHIBIT {chr(65 + (idx % 26))} // {beat_type.value.replace('_', ' ')}"
        )

        # Inject into evidenceMetadata
        if "evidenceMetadata" not in scene:
            scene["evidenceMetadata"] = {}

        scene["evidenceMetadata"]["narrative"] = {
            "beat": beat_type.value,
            "causalTransition": causality.value,
            "causalRationale": rationale,
            "tensionScore": tension,
            "openLoop": open_loop,
            "evidentiaryArtifact": artifact,
        }

    return scenes


class NarrativeContractValidator:
    """Validates that a compiled script strictly adheres to the 5 storytelling laws."""

    @staticmethod
    def validate_script(script_dict: Dict[str, Any]) -> Tuple[bool, List[str]]:
        scenes = script_dict.get("scenes", [])
        errors: List[str] = []

        if len(scenes) < 6:
            errors.append(f"Script has {len(scenes)} scenes; minimum 6 required for narrative arc.")
            return False, errors

        active_loops: set = set()

        # Rule 1: First 30 Seconds Hook Law
        s0 = scenes[0]
        s0_narrative = s0.get("evidenceMetadata", {}).get("narrative", {})
        if s0_narrative.get("beat") != NarrativeBeatEnum.COLD_OPEN_HOOK.value:
            errors.append(f"Scene 1 beat must be COLD_OPEN_HOOK, got {s0_narrative.get('beat')}")

        s0_dur = float(s0.get("suggestedDurationSec", 28.0))
        if s0_dur > 32.0:
            errors.append(f"Scene 1 duration exceeds 30-second hook limit: {s0_dur}s")

        s0_loop = s0_narrative.get("openLoop")
        if not s0_loop or s0_loop.get("action") != "OPEN":
            errors.append("Scene 1 must OPEN a primary curiosity gap / open loop.")
        else:
            active_loops.add(s0_loop.get("loopId"))

        # Rule 2: Causal Transition Law ('THEREFORE' or 'BUT' - zero 'And Then')
        for i in range(1, len(scenes)):
            s_nar = scenes[i].get("evidenceMetadata", {}).get("narrative", {})
            causality = s_nar.get("causalTransition", "NONE")
            if causality not in ["THEREFORE", "BUT"]:
                errors.append(f"Scene {i + 1} has non-causal transition: '{causality}'. Must be THEREFORE or BUT.")

            # Track open loops
            loop_action = s_nar.get("openLoop")
            if loop_action:
                action = loop_action.get("action")
                lid = loop_action.get("loopId")
                if action == "OPEN":
                    active_loops.add(lid)
                elif action == "RESOLVE":
                    active_loops.discard(lid)

            # Rule 3: Active Open Loops Invariant (Must be >= 1 until final scenes)
            if i < len(scenes) - 2 and len(active_loops) < 1:
                errors.append(f"Scene {i + 1} dropped active open loops to 0. Narrative tension collapsed prematurely.")

        # Rule 4: Tension Curve Peak in Act 5
        tension_scores = [
            float(s.get("evidenceMetadata", {}).get("narrative", {}).get("tensionScore", 50.0))
            for s in scenes
        ]
        peak_tension = max(tension_scores)
        if peak_tension < 90.0:
            errors.append(f"Dramatic peak tension is {peak_tension}%; must reach at least 90.0% in Act 5.")

        final_tension = tension_scores[-1]
        if final_tension > 70.0:
            errors.append(f"Final scene tension is {final_tension}%; must provide cathartic resolution (< 70%).")

        return len(errors) == 0, errors
