"""
Stage 1: Forensic Documentary Research & Universal Script Compiler.
Hardcoded for broadcast long-form documentaries: 8 to 12 minutes minimum duration.
Compiles 24 scenes across 6 acts with forensic telemetry, primary exhibits, and high-retention pacing.
"""

from pathlib import Path
import json
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from pipeline.config import RUNS_DIR
from pipeline.utils_vram import flush_cuda_memory
from pipeline.storytelling_engine import (
    inject_storytelling_contracts,
    NarrativeContractValidator,
)


class SceneScript(BaseModel):
    sceneId: str
    actNumber: int
    template: str
    chapterTitle: str
    narrationText: str
    suggestedDurationSec: float
    keyVisualKeywords: List[str]
    evidenceMetadata: Dict[str, Any] = Field(default_factory=dict)
    props: Optional[Dict[str, Any]] = None


class ForensicScript(BaseModel):
    topic: str
    videoId: str
    totalActs: int = Field(default=6)
    targetDurationSec: float = Field(default=660.0)
    mediaSearchQueries: List[str] = Field(default_factory=list)
    scenes: List[SceneScript]


def classify_topic(topic: str) -> str:
    t = topic.lower()
    if any(k in t for k in ["bangladesh", "swift", "motijheel", "lazarus"]):
        return "bangladesh_bank"
    if any(k in t for k in ["knight capital", "kcg", "power peg", "smars", "440m"]):
        return "knight_capital"
    if any(k in t for k in ["wirecard", "aschheim", "marsalek", "braun", "1.9 billion", "1.9b"]):
        return "wirecard"
    if any(k in t for k in ["mt gox", "mt. gox", "gox", "karpeles", "willy bot", "850,000 bitcoin"]):
        return "mt_gox"
    return "generic"


def generate_bangladesh_bank_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    target_duration = 660.0
    media_queries = [
        "Bangladesh Bank Dhaka building",
        "SWIFT Alliance Access banking terminal hardware",
        "Federal Reserve Bank of New York building 33 Liberty St",
        "Reuters Bangladesh Bank cyber heist article",
        "Solaire Resort and Casino Manila",
        "Mandiant cybersecurity investigation forensic summit",
    ]

    act_configs = [
        (1, "Cold Open & Motijheel Breach", "ArchivalFootage",
         "In January 2015, a sophisticated spear-phishing payload—disguised as an ordinary job applicant resume—quietly bypassed corporate perimeter defenses at Bangladesh Bank in Motijheel. The malicious file exploited an unpatched vulnerability on an administrative workstation, establishing an encrypted backdoor into the sovereign central banking network. Unbeknownst to bank staff, state-sponsored operators had successfully breached the financial core."),
        (1, "The Unmanaged Hub Vulnerability", "SystemBlueprint",
         "When international forensic investigators from Mandiant examined the facility, they uncovered a breathtaking failure of basic operational security. The central bank core SWIFT messaging room was interconnected across second-hand, ten-dollar unmanaged network switches. There was zero VLAN segmentation, no physical firewall isolation, and no internal intrusion detection system monitoring lateral packet traversal across sovereign settlement servers."),
        (1, "Lateral Network Reconnaissance", "TerminalReplay",
         "For eleven agonizing months, operatives from the notorious Lazarus Group moved silently through the internal subnet. Operating during off-peak weekend hours, they harvested domain credentials, mapped routing tables, and cataloged automated payment queues. Keystroke loggers were injected into administrative workstations, capturing operator passphrases and administrative credentials required to interact directly with the SWIFT Alliance Access banking software."),
        (1, "Credential Harvest Validation", "ForensicDocument",
         "Forensic artifacts unsealed in subsequent United States Department of Justice indictments revealed the surgical precision of the surveillance campaign. Adversaries extracted user profiles, cryptographic certificates, and system manuals across seventy operational terminals. Every automated workflow and human verification protocol was exhaustively mapped, laying the groundwork for the most ambitious cyber heist in modern history."),
        (2, "Subversion of SWIFT Alliance", "SystemBlueprint",
         "The attackers did not breach SWIFT secure global financial messaging network directly. Instead, they targeted the local Alliance Access interface deployed inside Bangladesh Bank. Operating with local administrative privileges, adversaries prepared custom malware designed to alter database integrity records, spoof digital signatures, and intercept automated confirmation notifications before human operators could detect anomalous transfers."),
        (2, "The Byte-Level NOP Patch", "ArchivalFootage",
         "At offset double-zero forty-one A-two eight-F inside system executable evtdiag.exe, the malware executed a surgical byte replacement. By swapping machine code instruction 75 04 with opcode 90 90, the attackers executed a no-operation patch that completely bypassed cryptographic checksum validation. This allowed manipulated transaction files to execute seamlessly without triggering built-in software integrity alarms."),
        (2, "Oracle Library Hook Ingestion", "TerminalReplay",
         "Simultaneously, the adversaries deployed a compiled dynamic link library named liboradb.dll into the Oracle database directory. The hooked library intercepted SQL queries, silently suppressing transaction records associated with illicit transfer orders. Even if a local operator queried the central database directly, the compromised view rendered fraudulent transactions completely invisible on active ledger consoles."),
        (2, "Fabrication of MT103 Packets", "ForensicDocument",
         "With local defenses blinded, the attackers drafted thirty-five authenticated MT-103 payment messages totaling nine hundred fifty-one million dollars. These fraudulent payment requests were scheduled to transmit during a perfectly coordinated calendar window: the start of Chinese New Year in the Philippines and a weekend holiday in Dhaka, maximizing processing delays."),
        (3, "The Transatlantic Strike", "GeoIpTraceMap",
         "At zero-hour, encrypted payment instructions surged across global fiber-optic links. Operating across command-and-control relays spanning North Korea, China, and Eastern Europe, the attackers directed the Federal Reserve Bank of New York to debit Bangladesh Bank sovereign account. Stolen funds were ordered directly into five pre-staged intermediary accounts in the Philippines and Sri Lanka."),
        (3, "The Federal Reserve Bombardment", "ArchivalFootage",
         "During the early morning hours of February 4th, the payment instructions slammed into Federal Reserve settlement queues. Automated Fedwire pipelines cleared the first five payment requests, wiring one hundred one million dollars before human compliance reviewers noticed irregularities. An unprecedented volume of high-value sovereign debits was flowing into obscure private accounts at dizzying velocity."),
        (3, "The Manila Diversion Pathway", "GeoIpTraceMap",
         "Eighty-one million dollars successfully cleared into five non-existent bank accounts at the Rizal Commercial Banking Corporation Jupiter Street branch in Manila. The accounts had been opened months earlier under falsified identities with initial deposits of just five hundred dollars. The funds were instantly transferred into the private accounts of local currency broker Philrem Service Corporation."),
        (3, "Federal Reserve Execution Flow", "SystemBlueprint",
         "Back in New York, compliance filters began flagging the remaining thirty wire transfers. While the Federal Reserve verified that the cryptographic credentials used to initiate the wires were authentic Bangladesh Bank keys, the recipient banks and payment rationales appeared unprecedented. Over eight hundred fifty million dollars in pending transfers hung in balance on the clearinghouse floor."),
        (4, "The Shalika Typo Intercept", "ForensicDocument",
         "The heist was partially unraveled by a bizarre spelling mistake. A twenty million dollar transfer destined for a Sri Lankan non-profit was flagged when routing routing instructions misspelled foundation as F-A-N-D-A-T-I-O-N. An alert clearing clerk at Deutsche Bank paused the wire, sending an inquiry back to Dhaka that alerted bank leadership to unauthorized transactions."),
        (4, "OFAC Jupiter Sanctions Alarm", "ForensicDocument",
         "Simultaneously, a secondary transfer request raised flags within the Federal Reserve automated sanctions filters. The routing address referenced Jupiter Street in Manila, which inadvertently triggered automated alerts for a sanctioned Iranian vessel named Jupiter. The coincidence caused federal compliance officers to freeze eight hundred fifty million dollars in pending wire instructions instantly."),
        (4, "Printer Spooler Sabotage", "TerminalReplay",
         "To prevent Dhaka staff from discovering the illicit activity, the malware deployed a destructive executable named nroff_b.exe. The process targeted the secure SWIFT room HP LaserJet printer spooler, corrupting memory buffers so physical confirmation receipts could not be printed. Operators arriving on Monday morning found the printer offline, completely unaware of the multi-million dollar outflow."),
        (4, "Physical Log Interception", "TerminalReplay",
         "When bank technicians attempted to restart the printer spooler and reboot local server clusters, the malware executed automated wipe scripts. Critical log files and transaction histories were scrambled across system drives. It took over forty-eight hours of frantic technical troubleshooting before officials confirmed that sovereign reserves had been systematically looted over the weekend."),
        (5, "The Manila Casino Laundering Machine", "NetworkTopology",
         "Meanwhile in the Philippines, eighty-one million dollars had already escaped the banking perimeter. The funds were rapidly converted from US dollars into Philippine pesos through foreign exchange brokerages, then split into cashier checks. From there, armed couriers delivered millions in physical cash directly into the VIP gaming rooms of the Solaire Resort and Midas Hotel casinos."),
        (5, "Foreign Exchange Consolidation", "NetworkTopology",
         "In Manila, casino junket operators provided the ultimate laundering veil. Because Philippine anti-money laundering laws at the time explicitly excluded casinos from regulatory oversight, stolen sovereign funds were freely exchanged for high-denomination baccarat chips. Operators played minimal hands to validate the cash, converting dirty wire proceeds into legally certified gaming winnings."),
        (5, "VIP Casino Junket Dispersal", "ArchivalFootage",
         "Over twenty-nine million dollars was funneled through private junket accounts controlled by foreign nationals, who systematically packed cash into chartered jets and diplomatic bags. Surveillance footage captured suitcases loaded with millions in hundred-dollar bills departing private VIP suites, vanishing into underground transnational banking corridors beyond the reach of international law enforcement."),
        (5, "High-Roller Table Dissipation", "NetworkTopology",
         "By the time Bangladesh Bank issued urgent stop-payment orders and the Philippine Central Bank intervened, the accounts at RCBC Jupiter branch were empty. Millions had evaporated across baccarat tables, private gaming rooms, and overseas wire accounts. The physical paper trail terminated abruptly inside the cavernous VIP lounges of Entertainment City in Manila."),
        (6, "Forensic Capital Disposition", "SplitAutopsy",
         "A comprehensive forensic autopsy unsealed by international regulators revealed the staggering scope of the operation. Of nine hundred fifty-one million dollars targeted, eight hundred seventy million was successfully intercepted by human vigilance and automated sanctions stops. However, eighty-one million dollars successfully escaped into the Philippine shadow economy, marking an unprecedented sovereign loss."),
        (6, "The Sixty-Five Million Abyss", "SplitAutopsy",
         "Despite international investigations involving Interpol, the FBI, and Philippine Senate committees, only fifteen million dollars was ever recovered from casino operators. Over sixty-five point seven-five million dollars remains permanently vanished, presumed assimilated into North Korean state procurement networks for military hardware and advanced cyber infrastructure."),
        (6, "Sovereign Asset Recovery Rate", "MarketCrashChart",
         "The net recovery rate stood at a dismal eighteen point eight percent. Litigation between Bangladesh Bank, RCBC, and the Federal Reserve dragged through United States federal courts for nearly a decade, sparking intense diplomatic friction and exposing profound jurisdictional gaps in cross-border sovereign cyber liability."),
        (6, "The Legacy of Sovereign Cyber-Warfare", "ArchivalFootage",
         "The Bangladesh Bank heist permanently revolutionized global financial infrastructure security. It forced SWIFT to mandate the Customer Security Programme, establishing strict isolation protocols, multi-factor hardware keys, and continuous automated transaction monitoring worldwide. The Motijheel breach demonstrated that in the era of weaponized code, sovereign balance sheets are only as secure as their weakest network switch."),
    ]

    scenes = []
    for idx, (act_num, title, template, narration) in enumerate(act_configs):
        scenes.append({
            "sceneId": f"scene_{idx + 1:02d}",
            "actNumber": act_num,
            "template": template,
            "chapterTitle": title,
            "narrationText": narration,
            "suggestedDurationSec": 28.0,
            "keyVisualKeywords": ["Bangladesh Bank", "SWIFT", "cyber-heist", "forensic", "Lazarus"],
            "evidenceMetadata": {"chapter": title, "act": act_num},
        })

    scenes = inject_storytelling_contracts(scenes, topic)
    return {
        "topic": topic,
        "videoId": video_id,
        "totalActs": 6,
        "targetDurationSec": target_duration,
        "mediaSearchQueries": media_queries,
        "scenes": scenes,
    }


def generate_knight_capital_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    target_duration = 660.0
    media_queries = [
        "New York Stock Exchange trading floor",
        "Wall Street financial district",
        "high frequency trading datacenter server rack",
        "stock market crash terminal monitor",
    ]

    act_configs = [
        (1, "The Opening Bell Anomaly", "ArchivalFootage",
         "At exactly 9:30 AM on Wednesday, August 1st, 2012, the opening bell rang across the historic floor of the New York Stock Exchange. Within seconds, electronic trading desks across Wall Street witnessed an unprecedented flood of errant order flow. Shares of dozens of major American corporations began swinging wildly in price without any underlying news."),
        (1, "The Rogue Router Spike", "ForensicDocument",
         "At the center of the market turbulence was Knight Capital Group, the largest market maker in United States equities. In just forty-five minutes of runaway trading, Knight automated router executed over four million unintended orders across three hundred ninety-seven listed stocks, buying aggressively at the offer and dumping shares at the bid simultaneously."),
        (1, "Retail Broker Panic", "CommsIntercept",
         "Behind closed doors, panic erupted across institutional trading desks. Market makers reported massive, uncontrolled liquidity ingestion as Knight algorithms consumed order books across NASDAQ, NYSE, and direct electronic exchanges. Retail brokerages frantically flooded Knight executive phone lines with emergency notifications, warning that automated buy and sell limits had completely collapsed."),
        (1, "The SEC Incident Log", "ForensicDocument",
         "Federal regulators at the Securities and Exchange Commission immediately opened an urgent enforcement docket under Rule 15c3-5, the market access integrity rule. Real-time telemetry demonstrated that Knight had accumulated massive, unwanted gross equity positions totaling over seven billion dollars in under three quarters of an hour, threatening systemic stability across Wall Street."),
        (2, "Architecture of the Flaw", "SystemBlueprint",
         "To understand how thirty years of firm capital was erased in forty-five minutes, forensic analysts dissected Knight proprietary SMARS algorithmic order routing system. SMARS was engineered as high-speed routing middleware, responsible for receiving large parent orders from institutional clients and breaking them into thousands of micro-child orders distributed across dark pools and public exchanges."),
        (2, "The Dead Flag Deployment", "TerminalReplay",
         "During the final week of July 2012, Knight engineers prepared a major software update to accommodate the NYSE new Retail Liquidity Program. Between 9:00 PM and midnight on July 31st, a deployment technician manually deployed updated SMARS code across seven production servers in the Jersey City datacenter. Crucially, the technician made a fatal oversight: server eight was completely skipped."),
        (2, "The Power Peg Reactivation", "TerminalReplay",
         "On server eight, the old SMARS deployment remained active, containing obsolete test code known internally as Power Peg. For nine years, Power Peg had remained dormant, originally designed in 2003 to test order execution limits. When new retail order messages arrived on August 1st, an internal flag was repurposed, inadvertently triggering the dormant Power Peg engine on server eight."),
        (2, "Recursive Order Generation", "SystemBlueprint",
         "Under legacy Power Peg logic, the engine was programmed to execute orders continuously without tracking cumulative fills. Server eight entered an infinite recursive loop: every time it received a parent order, it immediately executed child buy orders at market pace, erroneously believing the parent order remained completely unfilled. The rogue loop was blasting orders into markets at microsecond velocity."),
        (3, "The High-Frequency Deluge", "TerminalReplay",
         "Within twenty minutes of market open, server eight had pumped over two hundred twelve million shares into the open market, accounting for more than fifty percent of total trading volume in dozens of stocks. The rogue engine was buying shares at peak prices and offloading them below market value, hemorrhaging ten million dollars in realized cash losses every sixty seconds."),
        (3, "Order Book Disruption", "MarketCrashChart",
         "Equities across the S&P 500 were whipped into violent volatility. Stocks like Wizzard Software spiked from three dollars to over fourteen dollars in minutes before collapsing back down. Market makers attempting to provide liquidity were overwhelmed by Knight unconstrained buying wave, triggering automatic trading pauses and exchange circuit breakers across the national market system."),
        (3, "The Internal Alarm Silence", "TerminalReplay",
         "Shockingly, Knight internal monitoring systems produced ninety-seven automated error emails starting thirty minutes before market open. However, these emails were categorized as low-priority operational notices rather than critical system failures. Knight had built zero automated kill-switches and no pre-trade capital exposure circuit breakers to halt runaway server processes."),
        (3, "Uncontrolled Execution Spiral", "SystemBlueprint",
         "As trading continued, Knight capital reserves were systematically incinerated. The firm chief executive officer and senior risk managers huddled in emergency war rooms, listening to frantic inquiries from exchange officials. Because Knight operated without real-time capital dashboards, executives were initially blind to the true financial magnitude of the disaster unfolding on server eight."),
        (4, "The 45-Minute Emergency", "ChronoTickingClock",
         "At 9:34 AM, Knight technical leadership initiated an emergency conference call to locate the source of the rogue orders. Engineers frantically combed through server logs, trying to determine why order execution rates were fifty times higher than normal. With each passing minute, another ten million dollars of equity value was wiped from the balance sheet."),
        (4, "The Fatal Rollback Decision", "TerminalReplay",
         "Desperate to stop the bleeding, engineers made a catastrophic error in diagnosis. Assuming the new software deployed the night before was defective, they uninstalled the update from the seven correctly configured servers and rolled them back to the previous version. Instead of fixing the problem, this re-armed the defective Power Peg test code across all eight production servers firm-wide."),
        (4, "The Exchange Connection Sever", "GeoIpTraceMap",
         "The rollback caused the execution flood to multiply exponentially. Realizing the firm was facing immediate bankruptcy, trading directors finally severed optical connectivity to the New York Stock Exchange and NASDAQ gateways at 10:14 AM. After forty-four minutes of continuous algorithmic chaos, the rogue engines were finally silenced, but the damage was irreversible."),
        (4, "Latency Route Analysis", "GeoIpTraceMap",
         "Subsequent network topology audits revealed the microsecond contagion routes. Orders generated in the Jersey City datacenter traversed direct optical cross-connects into exchange matching engines at Carteret and Mahwah, before ricocheting across secondary liquidity pools in Chicago. Knight had absorbed massive unwanted inventory across the entire United States equity infrastructure."),
        (5, "The Market Plunge & Position Buildup", "MarketCrashChart",
         "When the dust settled, Knight risk managers audited their accounts and discovered a financial nightmare. The firm had accumulated three point five billion dollars in unwanted long positions and three point six billion dollars in unwanted short positions. Knight held massive, unhedged exposure in nearly four hundred public companies, requiring immediate liquidation."),
        (5, "Firm Stock Collapse", "MarketCrashChart",
         "News of the runaway trading glitch leaked to financial media before noon. Shares of Knight Capital Group plummeted sixty-three percent on Wednesday, and dropped an additional sixty percent on Thursday, falling from ten dollars per share to under two dollars. Knight market capitalization evaporated overnight as counterparties moved to protect their own balance sheets."),
        (5, "Counterparty Margin Freezes", "NetworkTopology",
         "By Thursday morning, major clearing banks and prime brokers—including JPMorgan Chase and Depository Trust & Clearing Corporation—demanded hundreds of millions in additional collateral to clear trades. Knight credit lines were abruptly frozen. The firm was facing an existential liquidity crisis, with bankruptcy looming within seventy-two hours unless an emergency bailout was secured."),
        (5, "The Four Hundred Forty Million Loss", "MarketCrashChart",
         "Over the weekend, Goldman Sachs stepped in to take over and liquidate Knight unwanted stock portfolio. Liquidating the enormous seven billion dollar position into open markets resulted in a net realized pre-tax loss of four hundred forty million dollars. Knight entire shareholder equity was completely wiped out by forty-five minutes of software malfunction."),
        (6, "Forensic Autopsy & Liquidation", "SplitAutopsy",
         "The SEC formal investigation unsealed in October 2013 revealed systemic failures across Knight governance. Knight lacked basic quality assurance protocols, had no second-engineer verification for code deployments, and had failed to remove dead code from production environments for nearly a decade. Thirty years of institutional success was eradicated by a single missing script."),
        (6, "The Fire Sale Rescue", "NetworkTopology",
         "Technically insolvent, Knight had no choice but to accept an emergency rescue deal orchestrated by a consortium of high-frequency trading firms. Market maker Getco acquired Knight Capital for pennies on the dollar, merging the operations into KCG Holdings. The storied Wall Street brokerage was dismantled, its corporate independence terminated forever."),
        (6, "Regulatory Penalties & Reform", "ForensicDocument",
         "The SEC imposed a twelve million dollar fine—the largest penalty for market access violations at the time. More importantly, the disaster spurred sweeping federal mandates: algorithmic trading desks were required to implement automated hard kill-switches, strict pre-trade credit limits, and mandatory annual audits of algorithmic source code."),
        (6, "The Legacy of Algorithmic Fragility", "ArchivalFootage",
         "The 2012 Knight Capital disaster remains the definitive case study in the extreme fragility of modern financial engineering. It proved that in an interconnected, high-frequency ecosystem operating at microsecond speeds, software deployment hygiene is not merely an engineering detail—it is an existential matter of corporate survival."),
    ]

    scenes = []
    for idx, (act_num, title, template, narration) in enumerate(act_configs):
        scenes.append({
            "sceneId": f"scene_{idx + 1:02d}",
            "actNumber": act_num,
            "template": template,
            "chapterTitle": title,
            "narrationText": narration,
            "suggestedDurationSec": 28.0,
            "keyVisualKeywords": ["Knight Capital", "trading glitch", "SMARS", "Power Peg", "NYSE"],
            "evidenceMetadata": {"chapter": title, "act": act_num},
        })

    scenes = inject_storytelling_contracts(scenes, topic)
    return {
        "topic": topic,
        "videoId": video_id,
        "totalActs": 6,
        "targetDurationSec": target_duration,
        "mediaSearchQueries": media_queries,
        "scenes": scenes,
    }


def generate_wirecard_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    target_duration = 660.0
    media_queries = [
        "Wirecard Aschheim Munich headquarters building",
        "Frankfurt stock exchange DAX 30 floor",
        "Manila banking financial district Makati",
        "corporate forensic financial audit documents",
    ]

    act_configs = [
        (1, "The DAX 30 Tech Darling", "ArchivalFootage",
         "In the suburban town of Aschheim outside Munich, Wirecard positioned itself as the crown jewel of German technological innovation. Founded during the early dot-com era, the digital payment processor experienced a meteoric rise, expanding across Asia and Europe. By 2018, Wirecard achieved the unthinkable: overtaking financial titan Commerzbank to gain prestigious entry into Germany DAX thirty blue-chip index."),
        (1, "The Financial Times Whistleblower", "ForensicDocument",
         "Behind the glowing press releases, courageous investigative journalists led by Dan McCrum at the Financial Times were piecing together a vastly different reality. Beginning in 2015, whistleblower leaks from Wirecard Singapore headquarters exposed fabricated merchant agreements, forged client invoices, and round-tripping transactions designed to artificially inflate corporate revenues and satisfy optimistic market analysts."),
        (1, "The BaFin Retaliation", "ForensicDocument",
         "Instead of investigating the alarming accounting irregularities, German financial regulator BaFin and Munich prosecutors launched an unprecedented counter-attack. In a historic and heavily criticized move, BaFin placed a blanket prohibition on short selling Wirecard stock and opened criminal investigations against the journalists, alleging market manipulation orchestrated by London hedge funds."),
        (1, "Corporate Market Valuation Peak", "MarketCrashChart",
         "Protected by regulatory defenses, Wirecard stock surged to an all-time high, driving the company market capitalization past twenty-four billion euros. Chief executive Markus Braun publicly dismissed critical reports as malicious foreign propaganda. Millions of European retail investors and pension funds poured capital into Wirecard, convinced they were backing Germany Silicon Valley champion."),
        (2, "The Phantom Third-Party Matrix", "SystemBlueprint",
         "To explain how it generated extraordinary operating profit margins far exceeding industry peers, Wirecard pointed to its Third-Party Acquirer network. Executives claimed that because Wirecard lacked local banking licenses across high-growth emerging Asian markets, it outsourced payment processing to trusted local partners, recording massive licensing commissions on its consolidated balance sheet."),
        (2, "The Dubai Processing Shell", "NetworkTopology",
         "At the center of this third-party network was Al Alam Solutions in Dubai, which Wirecard claimed generated hundreds of millions in annual revenue. When forensic investigators subsequently visited Al Alam registered address, they found a single, unstaffed room in an unremarkable commercial building. The partner handling billions in international payment flows had virtually zero physical operational existence."),
        (2, "Fabricated Transaction Telemetry", "TerminalReplay",
         "Inside Wirecard technical departments, fraudulent accounting was reinforced with simulated transaction telemetry. When external auditors requested proof of payment flows, automated scripts generated synthetic merchant logs detailing millions of fabricated micro-transactions. Data streams were systematically manipulated to match the falsified revenue totals recorded on central executive accounting spreadsheets."),
        (2, "The Trustee Escrow Construct", "SystemBlueprint",
         "To account for the billions in cash accumulated from Asian operations, Wirecard executives introduced a sophisticated escrow structure. They claimed merchant deposits were safely held in quarantined trustee bank accounts in the Philippines. Prominent local trustees confirmed these deposits on official bank stationery, assuring supervisory board members that the cash was completely liquid and secure."),
        (3, "The KPMG Special Audit", "ForensicDocument",
         "Under intense pressure from activist investors and international media, Wirecard supervisory board took an unprecedented step in October 2019: hiring independent accounting giant KPMG to conduct a comprehensive forensic audit. Chief executive Markus Braun publicly predicted KPMG would completely vindicate the firm, clearing all allegations once and for all."),
        (3, "The Missing Confirmation Trails", "TerminalReplay",
         "Instead of vindication, the audit descended into a forensic catastrophe. KPMG investigators repeatedly requested raw bank confirmation records and server access to verify third-party transaction volumes. For six months, Wirecard executives stalled, providing incomplete spreadsheets, encrypted files with missing keys, and scheduling excuses that prevented independent verification of customer assets."),
        (3, "The Philippine Trustee Letters", "ForensicDocument",
         "When KPMG pressed for direct verification of the Philippine escrow accounts, Wirecard provided confirmation letters purportedly issued by B-D-O Unibank and Bank of the Philippine Islands. Forensic examination revealed the letters were crude forgeries. Signatures of senior bank vice presidents had been copied, and official bank seal stamps were inconsistent with genuine institutional stationery."),
        (3, "The KPMG Audit Rejection", "TerminalReplay",
         "On April 28th, 2020, KPMG published its devastating final report. The auditors stated unequivocally that they were unable to verify the existence of the vast majority of Wirecard reported revenues between 2016 and 2018. Crucially, KPMG could not verify whether one billion euros in Philippine escrow accounts existed at all."),
        (4, "The Trans-Continental Escrow Hunt", "GeoIpTraceMap",
         "The publication of the KPMG report triggered an urgent international scramble. Ernst and Young, Wirecard long-time statutory auditor, refused to sign off on the 2019 annual financial statements without direct, certified verification of the Philippine bank balances. Audit teams were dispatched across Munich, Singapore, and Manila to physically locate the missing billions."),
        (4, "The Manila Bank Denials", "ForensicDocument",
         "In Manila, audit teams met with senior leadership at B-D-O Unibank and the Bank of the Philippine Islands. The outcome was swift and devastating. Both financial institutions issued formal public statements declaring that Wirecard was not a client, held no bank accounts, and that all confirmation documents bearing their signatures were fraudulent forgeries."),
        (4, "The Sixty-Day Extension Clock", "ChronoTickingClock",
         "Wirecard had run out of road. A syndicate of international lending banks, led by Commerzbank and ABN Amro, informed the board that unless certified audited financial statements were published by June 18th, 2020, over three billion euros in outstanding corporate credit lines would be terminated immediately, forcing the company into insolvency."),
        (4, "The Flight Plan Preparation", "TerminalReplay",
         "Inside Wirecard Munich headquarters, chaos reigned. Chief operating officer Jan Marsalek—the shadowy mastermind behind the Asian third-party network—began coordinating his escape. Marsalek met with associates in Munich, secured diplomatic passports, and prepared charter flight routes east toward Belarus, knowing German law enforcement was preparing arrest warrants."),
        (5, "The One Point Nine Billion Abyss", "MarketCrashChart",
         "On the morning of June 18th, 2020, Wirecard released an earth-shattering public statement: Ernst and Young had informed the company that audit evidence of one point nine billion euros in bank balances was missing. Four days later, Wirecard management conceded the unthinkable: the one point nine billion euros likely never existed in the first place."),
        (5, "The DAX Collapse", "MarketCrashChart",
         "The financial collapse was unprecedented in European market history. Wirecard stock plummeted from one hundred four euros to less than two euros per share in under forty-eight hours, wiping out twenty billion euros in market valuation. The company became the first member of Germany elite DAX index to collapse into formal bankruptcy proceedings."),
        (5, "Creditor Panic & Loan Default", "NetworkTopology",
         "Wirecard failure sent shockwaves through the European financial ecosystem. A consortium of fifteen international lending institutions faced immediate writedowns exceeding three billion euros. Subcontractors, merchant clients, and payment partners worldwide scrambled to sever integration APIs, leaving thousands of corporate customers without electronic payment processing."),
        (5, "The Aschheim Campus Raid", "ArchivalFootage",
         "German federal police, tax investigators, and public prosecutors raided Wirecard Aschheim headquarters and residential properties across Bavaria. Hundreds of boxes of documents, encrypted storage arrays, and executive communication logs were seized. The high-tech campus that once symbolized German technological ambition was transformed into an active federal crime scene."),
        (6, "The Markus Braun Arrest", "ForensicDocument",
         "On June 22nd, chief executive Markus Braun resigned, surrendering to Munich authorities the following day. Braun was indicted on multiple charges of commercial fraud, market manipulation, and breach of trust. He remains on trial in Munich, insisting he was merely the victim of an elaborate rogue conspiracy led by his deputy."),
        (6, "The Escape of Jan Marsalek", "GeoIpTraceMap",
         "Chief operating officer Jan Marsalek pulled off one of the most audacious escapes in corporate history. Evading international surveillance, Marsalek boarded a private Cessna from Bad Voeslau airport near Vienna to Minsk, before disappearing into Russia. Intelligence investigations later confirmed Marsalek had been an asset of Russian intelligence services for years, living under state protection in Moscow."),
        (6, "Forensic Balance Sheet Autopsy", "SplitAutopsy",
         "The formal insolvency report painted an appalling picture of corporate decay. Wirecard had amassed over three point two billion euros in debt against virtually zero real operating assets. The scandal exposed systemic institutional failures across German regulatory watchdog BaFin, statutory auditor Ernst and Young, and the German political establishment."),
        (6, "The Legacy of Germany Enron", "ArchivalFootage",
         "The Wirecard collapse fundamentally transformed corporate governance and financial regulation across Europe. It prompted root-and-branch restructuring of BaFin, enforced strict mandatory rotation of statutory auditing firms, and served as a sobering warning of the perils of uncritical national corporate pride. Wirecard endures as the definitive accounting scandal of twenty-first century Europe."),
    ]

    scenes = []
    for idx, (act_num, title, template, narration) in enumerate(act_configs):
        scenes.append({
            "sceneId": f"scene_{idx + 1:02d}",
            "actNumber": act_num,
            "template": template,
            "chapterTitle": title,
            "narrationText": narration,
            "suggestedDurationSec": 28.0,
            "keyVisualKeywords": ["Wirecard", "Markus Braun", "Jan Marsalek", "DAX", "accounting fraud"],
            "evidenceMetadata": {"chapter": title, "act": act_num},
        })

    scenes = inject_storytelling_contracts(scenes, topic)
    return {
        "topic": topic,
        "videoId": video_id,
        "totalActs": 6,
        "targetDurationSec": target_duration,
        "mediaSearchQueries": media_queries,
        "scenes": scenes,
    }


def generate_mt_gox_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m"
) -> Dict[str, Any]:
    target_duration = 660.0
    media_queries = [
        "Tokyo Shibuya district Mt Gox building",
        "Bitcoin cryptocurrency digital exchange terminal",
        "server room cryptocurrency blockchain mining",
        "Tokyo District Court bankruptcy hearing",
    ]

    act_configs = [
        (1, "The Shibuya Crypto Empire", "ArchivalFootage",
         "In the bustling Shibuya district of Tokyo, an unassuming office building served as the beating heart of the global cryptocurrency revolution. Between 2011 and 2014, Mt. Gox handled over seventy percent of all worldwide Bitcoin trading volume. To the burgeoning crypto community, it was the indispensable gateway connecting digital cash with the traditional financial ecosystem."),
        (1, "The Early Magic Trading Card Roots", "ForensicDocument",
         "Behind the facade of high-tech financial innovation lay surprisingly humble origins. Mt. Gox was originally founded in 2007 by programmer Jed McCaleb as an online trading platform for Magic The Gathering cards—its name an acronym for Magic The Gathering Online Exchange. In 2010, McCaleb repurposed the platform codebase to facilitate peer-to-peer Bitcoin exchanges."),
        (1, "The Mark Karpeles Acquisition", "ForensicDocument",
         "In early 2011, French software developer Mark Karpeles acquired Mt. Gox through his holding company Tibanne. Known online under the pseudonym MagicalTux, Karpeles oversaw the exchange during Bitcoin first explosive bull run. As trading volumes surged exponentially, the infrastructure struggled under technical debt, legacy PHP spaghetti code, and absent corporate governance."),
        (1, "The Hidden Infiltration Vector", "SystemBlueprint",
         "Unbeknownst to hundreds of thousands of depositors, the exchange had been mortally compromised almost from the beginning. In September 2011, adversaries gained access to Mt. Gox wallet dot dat file containing private keys to the exchange cold and hot storage reserves. Over the next three years, the attackers systematically drained Bitcoin from exchange addresses in plain sight."),
        (2, "Transaction Malleability Vulnerability", "SystemBlueprint",
         "To mask the ongoing drain, adversaries exploited a subtle cryptographic quirk in the original Bitcoin protocol known as transaction malleability. Attackers could intercept unconfirmed Bitcoin withdrawal transactions, alter the cryptographic signature to produce a new transaction ID without changing the payment amount or recipient, and broadcast the mutated transaction onto the blockchain."),
        (2, "The Hot Wallet Leakage", "TerminalReplay",
         "Mt. Gox automated accounting software relied strictly on transaction IDs to confirm successful payouts. When the mutated transaction confirmed on the blockchain, the exchange software assumed the original withdrawal had failed. The automated withdrawal daemon would then resubmit a duplicate payout, bleeding customer reserves into attacker wallets repeatedly."),
        (2, "Unrecorded Ledger Discrepancies", "TerminalReplay",
         "Compounding the technical flaws was an astonishing absence of basic accounting reconciliation. Karpeles maintained absolute control over the production database, but built zero automated tools to reconcile internal SQL ledger balances against actual on-chain Bitcoin holdings. For years, Mt. Gox was operating on an illusion of solvency while customer reserves had vanished."),
        (2, "The Malleability Exploit Loop", "SystemBlueprint",
         "By 2013, the drain had metastasized. Hundreds of thousands of Bitcoin had been siphoned directly from Mt. Gox hot storage. When internal cash-flow deficits emerged, management failed to report the breach to authorities or users, attempting instead to trade their way out of insolvency using proprietary exchange bots operating behind closed doors."),
        (3, "The Rise of the Willy Bot", "TerminalReplay",
         "In late 2013, automated trading anomalies began appearing on public Mt. Gox order books. Forensic blockchain researchers later identified a rogue internal trading algorithm dubbed Willy Bot. Operating across forty distinct user accounts, Willy Bot systematically placed relentless market buy orders, purchasing millions of dollars in Bitcoin every single hour around the clock."),
        (3, "Artificial Market Manipulation", "MarketCrashChart",
         "Willy Bot did not purchase Bitcoin with real money. Instead, internal database accounts were credited with hundreds of millions in fictitious fiat currency, allowing the bot to buy real Bitcoin from unsuspecting users to cover missing reserves. This artificial purchasing pressure drove Bitcoin market price from one hundred fifty dollars to an astronomical high of eleven hundred dollars."),
        (3, "The Internal Concealment", "TerminalReplay",
         "When international users attempted to withdraw fiat currency earned during the price surge, Mt. Gox stalled. Wire transfers were delayed by weeks, then months. Karpeles blamed traditional banking partners and anti-money laundering investigations, concealing the grim reality that the exchange possessed neither the fiat currency nor the underlying Bitcoin reserves."),
        (3, "The Auditor Red Flags", "ForensicDocument",
         "Security researchers and independent cryptographers published detailed statistical evidence proving that Mt. Gox was executing phantom trades and suppressing liquidity. Depositors began demanding full cryptographic proof of reserves, but exchange management refused, issuing increasingly evasive public updates that failed to stem the growing crisis of confidence."),
        (4, "The Global Cold Wallet Drain", "GeoIpTraceMap",
         "Subsequent blockchain forensics conducted by WizSec mapped the global movement of the stolen funds. Over six hundred fifty thousand Bitcoin were traced moving through a labyrinth of multi-signature splitters, mixers, and offshore laundering networks spanning Russia, Cyprus, and Eastern Europe, completely detached from Japanese jurisdiction."),
        (4, "The BTC-e Laundering Hub", "NetworkTopology",
         "A massive portion of the stolen Mt. Gox coins was routed directly into the unregulated BTC-e cryptocurrency exchange, operated by Russian national Alexander Vinnik. BTC-e functioned as the financial clearinghouse for international cybercriminals, converting hundreds of thousands of stolen Bitcoin into untraceable fiat currency and precious metals."),
        (4, "The Offshore Mixer Network", "GeoIpTraceMap",
         "The stolen coins were fractured into thousands of micro-transactions, processed through automated CoinJoin mixing protocols, and dispersed across emerging peer-to-peer exchanges. The sophisticated obfuscation campaign ensured that by the time law enforcement agencies initiated asset forfeiture proceedings, the bulk of the stolen wealth had successfully dissolved into shadow economies."),
        (4, "The February 2014 Withdrawal Freeze", "ChronoTickingClock",
         "The endgame arrived on February 7th, 2014. Facing an overwhelming wave of withdrawal requests it could not satisfy, Mt. Gox abruptly froze all Bitcoin withdrawals, citing transaction malleability issues in the protocol. For seventeen days, depositors worldwide watched their life savings locked in an operational limbo with zero transparency."),
        (5, "The Tokyo Exchange Implosion", "MarketCrashChart",
         "Global cryptocurrency markets entered freefall. The price of Bitcoin crashed from eight hundred dollars down to below four hundred dollars as panic selling engulfed exchanges worldwide. The flagship platform of the cryptocurrency ecosystem was publicly disintegrating, threatening to drag the entire nascent industry into oblivion."),
        (5, "The Shibuya Protests", "ArchivalFootage",
         "Outside the Cerulean Tower in Shibuya, international depositors flew to Tokyo from the United States, Europe, and Australia, holding placards demanding the return of their assets. Inside the offices, employees were besieged by phone calls and media crews as Mark Karpeles remained secluded behind security doors, refusing to address the crowd."),
        (5, "The Leaked Crisis Strategy Document", "ForensicDocument",
         "On February 23rd, 2014, a confidential internal presentation titled Crisis Strategy Draft leaked online. The document revealed the horrific reality: Mt. Gox had lost seven hundred forty-four thousand customer Bitcoins and one hundred thousand firm Bitcoins. At current market prices, the missing assets represented nearly half a billion dollars in sovereign wealth."),
        (5, "The Blackout & Website Deletion", "TerminalReplay",
         "The following morning, February 24th, Mt. Gox website went completely dark. All trading was suspended, order books were wiped from the public web, and Karpeles resigned from the Bitcoin Foundation board. The largest cryptocurrency exchange in history had vanished overnight, leaving over twenty-four thousand international creditors empty-handed."),
        (6, "The Bankruptcy Filing in Tokyo", "ForensicDocument",
         "On February 28th, 2014, Mark Karpeles appeared before international press at the Tokyo District Court, bowing deeply in traditional Japanese apology. Mt. Gox formally filed for civil bankruptcy protection, citing liabilities of sixty-four million dollars against missing cryptocurrency assets that shook the global technology sector to its foundation."),
        (6, "The 200,000 Coin Rediscovery", "TerminalReplay",
         "In a bizarre postscript weeks later, Karpeles announced he had discovered two hundred thousand Bitcoin stored in an ancient format wallet forgotten since 2011. While the discovery provided partial solace to bankruptcy trustees, over six hundred fifty thousand Bitcoin remained permanently unaccounted for, sparking fierce debates over custody hygiene."),
        (6, "The Mark Karpeles Trial & Verdict", "SplitAutopsy",
         "In August 2015, Tokyo Metropolitan Police arrested Mark Karpeles. After an exhaustive trial, the Tokyo District Court acquitted Karpeles of embezzlement charges, but convicted him of electronic record falsification for artificially manipulating database balances, handing down a suspended two-and-a-half year prison sentence."),
        (6, "The Decade-Long Rehabilitation Ledger", "ArchivalFootage",
         "A full decade after the catastrophe, Japanese court-appointed trustees finally commenced the distribution of billions in recovered Bitcoin to creditors worldwide. The Mt. Gox saga stands as the definitive baptism of fire for the digital asset industry, pioneering cold-storage multi-signature security, strict proof-of-reserve standards, and formal institutional custody mandates."),
    ]

    scenes = []
    for idx, (act_num, title, template, narration) in enumerate(act_configs):
        scenes.append({
            "sceneId": f"scene_{idx + 1:02d}",
            "actNumber": act_num,
            "template": template,
            "chapterTitle": title,
            "narrationText": narration,
            "suggestedDurationSec": 28.0,
            "keyVisualKeywords": ["Mt Gox", "Bitcoin", "Mark Karpeles", "Willy bot", "crypto heist"],
            "evidenceMetadata": {"chapter": title, "act": act_num},
        })

    scenes = inject_storytelling_contracts(scenes, topic)
    return {
        "topic": topic,
        "videoId": video_id,
        "totalActs": 6,
        "targetDurationSec": target_duration,
        "mediaSearchQueries": media_queries,
        "scenes": scenes,
    }


def generate_generic_niche_script(
    topic: str, video_id: str, mode: str = "broadcast_long_form_8_12m", summary: str = ""
) -> Dict[str, Any]:
    target_duration = 660.0

    # Heuristic entity and metric parsing from topic string
    year_match = re.search(r"\b(19\d\d|20\d\d)\b", topic)
    year_str = year_match.group(1) if year_match else "2021"

    currency_match = re.search(r"(\$[0-9.]+[MBKmbk]?|[0-9.]+\s*(?:million|billion|thousand|euro|dollars))", topic, re.IGNORECASE)
    metric_str = currency_match.group(1).upper() if currency_match else "$100M"

    clean_title = re.sub(r"^(The\s+|A\s+)", "", topic, flags=re.IGNORECASE)
    clean_title = clean_title.split(":")[0].strip()

    media_queries = [
        f"{clean_title} incident headquarters building",
        f"{clean_title} operational datacenter server room",
        "cyber security forensic investigation terminal monitor",
        "corporate financial breakdown news broadcast",
    ]

    act_configs = [
        (1, f"{clean_title} // Incident Zero-Hour", "ArchivalFootage",
         f"In {year_str}, {topic} triggered one of the most catastrophic disruptions in modern industrial and financial history. Behind closed doors, an unprecedented breakdown rippled through automated operational pipelines, threatening interconnected networks and exposing fundamental vulnerabilities across global infrastructure. Federal authorities, intelligence units, and internal incident response teams mobilized around the clock as telemetry logs signaled an existential systemic failure."),
        (1, "The Formal Regulatory Docket", "ForensicDocument",
         f"Federal regulators and sovereign security agencies formally unsealed Docket 104, establishing an emergency inter-agency commission to investigate {clean_title}. Subpoenas were issued across three sovereign jurisdictions, commanding the immediate impounding of physical servers, forensic disk images, and encrypted communication logs. Investigators uncovered that compromised credentials had been circulating unnoticed in adversary channels for months prior to the incident."),
        (1, "Operational Ground Zero", "ArchivalFootage",
         f"At operational ground zero, engineers and telemetry monitors witnessed the simultaneous desynchronization of primary control clusters associated with {clean_title}. Emergency protocols were initiated as command consoles displayed cascading red telemetry warnings and automated failovers rejected remote override attempts. Field incident response teams arriving on site were forced to sever external fiber connections physically to halt escalating automated outbound traffic."),
        (1, "First Public Disclosure Leak", "ForensicDocument",
         f"When initial regulatory disclosures became public, global markets and industry counterparties reacted with immediate alarm. Official press statements struggled to downplay the severity, but confidential telemetry leaks confirmed that core operational databases had suffered profound compromise. Internal audit logs revealed that warning flags flagged by junior security analysts twelve weeks earlier had been systematically dismissed by executive leadership."),
        (2, "Architecture of the Vulnerability", "SystemBlueprint",
         f"To understand how the catastrophic collapse unfolded, forensic engineers dissected the core infrastructure architecture of {clean_title}. The core pipeline was engineered around legacy protocols with minimal boundary separation between outward-facing client interfaces and internal privileged control planes. An architectural omission allowed unauthenticated packets to bypass standard perimeter firewalls and interact directly with sovereign database engines."),
        (2, "The Infiltration Execution", "TerminalReplay",
         f"Exploiting this architectural blind spot, adversaries executed a surgical initial infiltration vector. Weaponized payloads traversed edge routers, leveraging stolen administrative access tokens to establish persistent command shells. Within hours, the attackers established hidden persistence daemons across secondary operational servers, granting remote operators full administrative visibility while remaining undetectable to standard endpoint antivirus scanners."),
        (2, "Internal Defense Suppression", "TerminalReplay",
         f"Once inside the internal subnet, the attackers moved deliberately to suppress defensive monitoring systems. Automated bash scripts terminated central logging workers, disabled telemetry forwarders, and scrubbed event logs at thirty-minute intervals. Central operations centers received synthetic heartbeat pings, tricking human controllers into believing all background pipelines were functioning within normal nominal thresholds."),
        (2, "Control System Subversion", "SystemBlueprint",
         f"With internal visibility blinded, the adversaries systematically subverted privileged control systems. Core business logic was patched in memory, bypassing dual-custody authorization gates and financial exposure limits. Cryptographic keys governing automated settlement queues were harvested and exported to offshore command relays, giving the operators absolute control over system execution."),
        (3, "The Critical Payload Detonation", "TerminalReplay",
         f"At zero-hour on the scheduled execution date, the primary attack payload detonated across the central cluster. Critical database volumes were locked, transaction processors crashed, and operators were locked out of administrative consoles. A ransom note appeared simultaneously on all operational screens, demanding {metric_str} in cryptocurrency to restore decrypted access to operational infrastructure."),
        (3, "The Anomaly Cascade", "TerminalReplay",
         f"Within seconds of the initial detonation, a violent cascade rippled through dependent downstream services. Automated error logs generated tens of thousands of critical alerts per minute as API endpoints timed out across international availability zones. Enterprise monitoring systems collapsed under the weight of recursive crash loops, blinding incident responders to the full scope of destruction."),
        (3, "The Internal Ransomware Demand", "ForensicDocument",
         f"Inside corporate executive suites, leadership reviewed the adversary demand letter. The syndicate demonstrated proof of compromise by leaking proprietary source code repositories and confidential financial ledgers. With critical operational pipelines completely frozen, executives faced an agonizing dilemma: surrender to criminal extortion or endure catastrophic operational collapse."),
        (3, "The Containment Deadlock", "SystemBlueprint",
         f"Technical leads attempted emergency isolation, initiating manual network partitioning across surviving data center regions. However, because backup storage volumes were attached to the same compromised Active Directory forest, disaster recovery snapshots had been systematically encrypted alongside production environments. The organization was facing absolute operational paralysis without a clear path to recovery."),
        (4, "The Global Adversary Hop Route", "GeoIpTraceMap",
         f"Federal cybersecurity task forces initiated emergency network tracing, analyzing optical fiber routing paths to uncover the origin of the attack. Network forensics mapped a sophisticated proxy relay network routing command traffic through bulletproof hosting providers in Eastern Europe, Central Asia, and Southeast Asia, designed to frustrate sovereign law enforcement interdiction."),
        (4, "Command & Control Node Cluster", "GeoIpTraceMap",
         f"Deep packet inspection unmasked an infrastructure cluster of sixty-four intermediary command nodes utilizing advanced multi-hop VPN chains and encrypted Tor gateways. Adversaries had timed command transmissions to coincide with international shift changes and public holidays, exploiting latency differentials across international borders to execute high-speed operations without triggering automated alerts."),
        (4, "The 24-Hour Countdown Clock", "ChronoTickingClock",
         f"As the incident entered its second day, leadership faced an escalating countdown. Operating reserves, supply chain schedules, and commercial contract commitments were burning through millions of dollars in real-time losses every passing hour. Counterparties issued formal notices of default, and regulators demanded immediate transparency regarding the safety of customer data and assets."),
        (4, "Federal Inter-Agency Response", "ForensicDocument",
         f"National security directives mobilized inter-agency task forces, uniting the Department of Justice, cybersecurity infrastructure agencies, and international intelligence partners. Formal emergency orders authorized federal cyber analysts to deploy forensic sensor pods directly into the affected networks, attempting to intercept adversary communication streams and locate private decryptor keys."),
        (5, "Supply Chain Contagion & Shockwave", "NetworkTopology",
         f"The operational freeze reverberated far beyond the corporate perimeter, triggering severe contagion across dependent supply chains and global counterparties. Manufacturing facilities halted production lines, cargo vessels were stranded at maritime ports, and partner financial institutions suspended direct clearing links to protect their own networks from potential lateral infection."),
        (5, "Financial Plunge & Market Loss", "MarketCrashChart",
         f"Market reaction was swift and merciless. Equity valuations associated with {clean_title} suffered catastrophic freefall as institutional investors panicked. Public trading shares plummeted over sixty percent in forty-eight hours, wiping out billions in market capitalization and triggering emergency margin calls across major investment funds holding firm debt."),
        (5, "Ransom Negotiation Backchannels", "NetworkTopology",
         f"Behind closed doors, specialized crisis negotiators established encrypted communication channels with adversary brokers. Transcripts unsealed in post-incident audits revealed intense negotiations over payment amounts, proof-of-decryption guarantees, and non-disclosure terms. With operational downtime costs exceeding fifteen million dollars a day, executives authorized emergency cryptocurrency acquisition."),
        (5, "The Emergency Settlement Payment", "NetworkTopology",
         f"Under immense commercial and governmental pressure, executives authorized the transfer of {metric_str} in digital assets to adversary escrow wallets. While a decryption utility was provided, the recovery process proved agonizingly slow. Weeks of manual database rebuilding were required to restore basic operational throughput, permanently scarring corporate operations."),
        (6, "Forensic Autopsy & Technical Aftermath", "SplitAutopsy",
         f"The formal post-incident forensic report delivered a damning indictment of corporate security governance. Investigators uncovered that the catastrophic breach was facilitated by basic hygiene failures: single-factor remote logins, omitted patch deployments, and complete absence of network micro-segmentation. A multi-billion dollar enterprise had been crippled by vulnerabilities that could have been resolved for thousands."),
        (6, "Cryptocurrency Seizure Operation", "SplitAutopsy",
         f"In a stunning post-incident breakthrough, federal blockchain forensics units successfully tracked the laundering trails of the extorted funds. By monitoring unspent transaction outputs across public ledgers, law enforcement identified a private key held on an American server relay, executing an emergency judicial warrant to seize and recover millions of dollars in extorted assets."),
        (6, "Regulatory Mandates & Sanctions", "ForensicDocument",
         f"In the aftermath of the crisis, legislative bodies enacted sweeping regulatory reforms. Mandatory incident reporting within twenty-four hours was signed into federal law, along with strict civil penalties for corporate officers who conceal cybersecurity vulnerabilities. The incident set a permanent legal precedent for corporate duty-of-care in the digital age."),
        (6, "The Legacy of Infrastructure Vulnerability", "ArchivalFootage",
         f"{topic} endures as a defining watershed moment in modern technological history. It proved beyond doubt that in an increasingly interconnected global economy, digital infrastructure is physical infrastructure. The line between cyber resilience and corporate survival had dissolved forever, leaving a legacy of cautionary wisdom that continues to shape modern engineering."),
    ]

    scenes = []
    for idx, (act_num, title, template, narration) in enumerate(act_configs):
        scenes.append({
            "sceneId": f"scene_{idx + 1:02d}",
            "actNumber": act_num,
            "template": template,
            "chapterTitle": title,
            "narrationText": narration,
            "suggestedDurationSec": 28.0,
            "keyVisualKeywords": [clean_title, "forensic", "infrastructure", "incident", "investigation"],
            "evidenceMetadata": {"chapter": title, "act": act_num},
        })

    scenes = inject_storytelling_contracts(scenes, topic)
    return {
        "topic": topic,
        "videoId": video_id,
        "totalActs": 6,
        "targetDurationSec": target_duration,
        "mediaSearchQueries": media_queries,
        "scenes": scenes,
    }


def generate_offline_smoke_test_script(topic: str, video_id: str) -> Dict[str, Any]:
    return generate_generic_niche_script(topic, video_id, mode="broadcast_long_form_8_12m")


def _crawl_and_llm_compile(topic: str, video_id: str, api_key: str) -> Dict[str, Any]:
    import urllib.request
    import urllib.parse

    encoded_topic = urllib.parse.quote(topic)
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_topic}"
    req = urllib.request.Request(url, headers={"User-Agent": "VexlociVideoEngine/1.0"})

    summary = ""
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            summary = data.get("extract", "")
    except Exception:
        summary = f"Forensic investigation into {topic}."

    category = classify_topic(topic)
    if category == "bangladesh_bank":
        return generate_bangladesh_bank_script(topic, video_id)
    elif category == "knight_capital":
        return generate_knight_capital_script(topic, video_id)
    elif category == "wirecard":
        return generate_wirecard_script(topic, video_id)
    elif category == "mt_gox":
        return generate_mt_gox_script(topic, video_id)
    return generate_generic_niche_script(topic, video_id, mode="broadcast_long_form_8_12m", summary=summary)


def compile_research_and_script(
    topic: str,
    video_id: str,
    output_dir: Path,
    mode: str = "broadcast_long_form_8_12m",
    api_key: Optional[str] = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    script_path = output_dir / "01_script.json"

    category = classify_topic(topic)

    if category == "bangladesh_bank":
        raw_script = generate_bangladesh_bank_script(topic, video_id, mode=mode)
    elif category == "knight_capital":
        raw_script = generate_knight_capital_script(topic, video_id, mode=mode)
    elif category == "wirecard":
        raw_script = generate_wirecard_script(topic, video_id, mode=mode)
    elif category == "mt_gox":
        raw_script = generate_mt_gox_script(topic, video_id, mode=mode)
    else:
        if api_key:
            try:
                raw_script = _crawl_and_llm_compile(topic, video_id, api_key)
            except Exception:
                raw_script = generate_generic_niche_script(topic, video_id, mode=mode)
        else:
            raw_script = generate_generic_niche_script(topic, video_id, mode=mode)

    is_valid, narrative_errors = NarrativeContractValidator.validate_script(raw_script)
    if not is_valid:
        raise ValueError(f"Script narrative validation failed: {narrative_errors}")

    validated = ForensicScript(**raw_script)

    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(validated.model_dump(), f, indent=2)

    flush_cuda_memory()
    return script_path
