// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarketplaceActorRegistry {
    function isActorActive(address actor, uint8 role) external view returns (bool);
    function isArbiterActive(address arbiter) external view returns (bool);
    function isVerifierActive(address verifier) external view returns (bool);
    function isPredicateVerifierActive(address verifierContract) external view returns (bool);
    function verifyActorSignature(address actor, bytes32 payloadHash, bytes calldata signature)
        external
        view
        returns (bool);
}

interface IMarketplacePredicateVerifier {
    function verifyPredicate(bytes32 predicateHash, bytes calldata publicInputs, bytes calldata proof)
        external
        view
        returns (bool);
}

/// @notice Minimal local-EVM harness for the Marketplace protocol core.
/// @dev Rich cost-field objects live off-chain. This contract anchors money, bonds,
/// hashes, gates, and settlement events so the protocol can be pressure-tested.
contract MarketplaceEscrow {
    uint8 private constant ROLE_BUYER = 1;
    uint8 private constant ROLE_SELLER = 2;
    uint256 public constant ARBITER_REPLACEMENT_TIMEOUT = 1 days;
    uint256 public constant FLOOR_RESOLUTION_TIMEOUT = 1 days;
    uint256 public constant ROUTE_CLAIM_TIMEOUT = 3 days;
    uint256 public constant MAX_FLOOR_PANEL_MEMBERS = 16;

    enum State {
        None,
        EscrowFunded,
        EvidencePending,
        RouteLocked,
        RouteInProgress,
        InspectionOpen,
        ClaimOrDisputePending,
        Settled,
        Cancelled
    }

    enum EvidenceKind {
        Item,
        Trust,
        Route,
        Settlement,
        Claim,
        PrivatePredicate
    }

    enum VerifierRouteClass {
        None,
        Neutral,
        BuyerDesignated
    }

    enum VerifierAuthorityLevel {
        None,
        PrivateAdvisor,
        SettlementVerifier,
        DisputeWitness
    }

    enum FeePayer {
        None,
        Buyer,
        Escrow
    }

    struct JscVerifierRoute {
        VerifierRouteClass routeClass;
        VerifierAuthorityLevel authorityLevel;
        address acceptedVerifier;
        bytes32 scopeHash;
        bytes32 evidenceFloorHash;
        bytes32 feeScheduleHash;
        FeePayer feePayer;
        bool feeOutcomeIndependent;
        uint256 buyerDisputeBondRequired;
        uint256 verifierBondRequired;
        uint256 verifierExposureCap;
        uint64 verifierBondTailSeconds;
        bytes32 appealHash;
        bool witnessCanSettle;
    }

    struct FloorJudgmentRoute {
        address[] panelMembers;
        uint8 requiredSignatures;
        uint64 appealWindowSeconds;
        bytes32 appealAuthorityHash;
        bytes32 panelMetadataHash;
    }

    struct AlphaAdmissionPolicy {
        bytes32 policyHash;
        address policyAuthority;
        uint64 version;
        uint64 effectiveBlock;
        bytes32 routeClass;
        uint256 maxTradeValue;
        uint256 principalExposureAfter;
        uint256 maxPrincipalExposure;
        bytes32 controlClusterId;
        uint256 controlClusterExposureAfter;
        uint256 maxControlClusterExposure;
        bytes32 custodianId;
        uint256 custodianExposureAfter;
        uint256 maxCustodianExposure;
        address verifier;
        uint256 verifierExposureAfter;
        uint256 maxVerifierExposure;
        address judgmentAuthority;
        uint256 judgmentAuthorityExposureAfter;
        uint256 maxJudgmentAuthorityExposure;
        bytes32 registryVersionHash;
        uint256 registryVersionExposureAfter;
        uint256 maxRegistryVersionExposure;
        uint64 epochId;
        uint256 globalEpochLossAfter;
        uint256 maxGlobalEpochLoss;
        bytes32 deliveryMode;
        bytes32 disputeBranch;
        bool manualOverride;
        address manualAuthority;
        address manualSecondApprover;
        bytes32 manualReasonHash;
        uint256 manualOverrideLoss;
        uint256 manualRemainingLossBudget;
    }

    struct DeliveryTriggerPolicy {
        bytes32 policyHash;
        bytes32 witnessClassHash;
        address witnessIssuer;
        bytes32 issuerConflictRef;
        bytes32 scopeHash;
        uint64 expiryBlock;
        uint64 challengeDeadlineBlock;
        uint256 settlementCeiling;
        bool sellerAssociated;
        uint8 independentWitnessCount;
        bool missingWitnessCanEstablishNonDelivery;
    }

    struct PostHandoffRemedy {
        bytes32 claimTypeHash;
        bytes32 remedyTypeHash;
        uint256 maxAmount;
        bool returnRequired;
        bytes32 returnCustodyHash;
        bytes32 evidenceRoot;
        bytes32 appealFinalStateHash;
        bool nonReturnRemedyAllowed;
    }

    struct TypedSpendability {
        address issuer;
        bytes32 canonicalPreimageHash;
        bytes32 constituentClaimsHash;
        bytes32 sourceClaimsAvailabilityHash;
        bytes32 validatorCodeHash;
        bytes32 validatorPolicyHash;
        bytes32 issuerRoleHash;
        uint8 issuerAuthorityCeiling;
        bytes32 issuerConflictRef;
        bytes32 registrySnapshotHash;
        uint64 expiryBlock;
        bytes32 dataAvailabilityHash;
        bytes32 preimageAvailabilityHash;
        bytes32 notClaimingHash;
        bytes32 sourceBasisHash;
        address sourceClaimAuthor;
        bool downgraded;
        bool valueCapped;
    }

    struct Trade {
        address buyer;
        address seller;
        address arbiter;
        uint256 escrowAmount;
        uint256 sellerBondRequired;
        uint256 sellerBondLocked;
        uint256 disputeBondRequired;
        uint256 disputeBondLocked;
        uint256 inspectionSeconds;
        uint256 routeCommittedAt;
        uint256 deliveredAt;
        uint256 claimOpenedAt;
        bool postDeliveryClaim;
        bytes32 claimHash;
        State state;
        bytes32 intentHash;
        bytes32 termsHash;
        bytes32 jscHash;
        address floorExecutor;
        bytes32 floorJudgmentRouteHash;
        bytes32 floorPanelMembersHash;
        uint8 floorPanelSize;
        uint8 floorRequiredSignatures;
        uint64 floorAppealWindowSeconds;
        bytes32 floorAppealAuthorityHash;
        bytes32 floorPanelMetadataHash;
        bytes32 alphaPolicySnapshotHash;
        uint64 alphaPolicyVersion;
        bytes32 alphaRouteClass;
        bytes32 alphaDeliveryMode;
        bytes32 alphaDisputeBranch;
        bytes32 alphaRegistryVersionHash;
        uint64 alphaEpochId;
        bytes32 alphaPolicyHash;
        address alphaPolicyAuthority;
        bytes32 alphaControlClusterId;
        bytes32 alphaCustodianId;
        address alphaVerifier;
        address alphaJudgmentAuthority;
        uint256 alphaMaxVerifierExposure;
        uint256 alphaPrincipalExposureReserved;
        uint256 alphaControlClusterExposureReserved;
        uint256 alphaCustodianExposureReserved;
        uint256 alphaVerifierExposureReserved;
        uint256 alphaJudgmentAuthorityExposureReserved;
        uint256 alphaRegistryVersionExposureReserved;
        uint256 alphaEpochExposureReserved;
        bytes32 jscVerifierRouteHash;
        VerifierRouteClass verifierRouteClass;
        VerifierAuthorityLevel verifierAuthorityLevel;
        address acceptedVerifier;
        bytes32 acceptedVerifierScopeHash;
        bytes32 verifierEvidenceFloorHash;
        bytes32 verifierFeeScheduleHash;
        FeePayer verifierFeePayer;
        bool verifierFeeOutcomeIndependent;
        uint256 jscBuyerDisputeBondRequired;
        uint256 verifierBondRequired;
        uint256 verifierBondLocked;
        address verifierBondOwner;
        uint64 verifierBondTailSeconds;
        uint64 verifierBondReleaseAt;
        uint256 verifierExposureCap;
        bytes32 verifierAppealHash;
        bool verifierWitnessCanSettle;
        bytes32 itemFingerprintHash;
        bytes32 inventoryLockHash;
        bytes32 fingerprintChallengeHash;
        bytes32 allowedChallengeResolutionScopeHash;
        bytes32 routeHash;
        bytes32 routeWallBundleHash;
        bytes32 routeSpendabilityHash;
        bytes32 routeAssemblyHistoryHash;
        bytes32 routeAssemblyWitnessHash;
        bytes32 deliveryHash;
        bytes32 deliveryWitnessHash;
        bytes32 deliveryPolicyHash;
        bytes32 receiptHash;
        bytes32 postHandoffRemedyHash;
        uint256 postHandoffRemedyMaxAmount;
        bool postHandoffReturnRequired;
        bytes32 postHandoffReturnCustodyHash;
        bytes32 postHandoffEvidenceRoot;
        bytes32 postHandoffAppealFinalStateHash;
        bool postHandoffNonReturnRemedyAllowed;
        uint256 proofCount;
        uint256 evidenceCount;
        uint256 verifierAttestationCount;
        bool inPersonAllowed;
        bool insured;
        uint256 declaredInsurance;
    }

    struct VerifierAttestation {
        address verifier;
        bytes32 subjectHash;
        bytes32 scopeSetHash;
        bytes32 methodIdHash;
    }

    struct ArbiterReplacement {
        address proposedArbiter;
        bytes32 proposalHash;
        uint64 proposedAt;
        bool buyerApproved;
        bool sellerApproved;
    }

    error BadAddress();
    error BadAmount();
    error BadHash();
    error BadState(State current);
    error Unauthorized();
    error WrongBondAmount();
    error InspectionWindowOpen();
    error InspectionWindowClosed();
    error ClosedTrade();
    error TransferFailed();
    error UnregisteredActor(address actor);
    error UnregisteredArbiter(address arbiter);
    error UnregisteredPredicateVerifier(address verifierContract);
    error BadSignature(address signer, bytes32 payloadHash);
    error DuplicatePacket(bytes32 packetHash);
    error PredicateVerificationFailed(address verifierContract, bytes32 predicateHash);
    error ReplacementProposalMissing(bytes32 proposalHash);
    error ReplacementTimeoutOpen(uint256 availableAt);
    error ArbiterStillActive(address arbiter);
    error RouteClaimTimeoutOpen(uint256 availableAt);
    error ItemFingerprintMissing();
    error ItemFingerprintAlreadyLocked(bytes32 itemFingerprintHash, uint256 tradeId);
    error UnapprovedFingerprintVerifier(address verifier);
    error InventoryLockFingerprintMismatch(bytes32 expectedItemFingerprintHash, bytes32 providedItemFingerprintHash);
    error InventoryLockMissing();
    error InventoryAlreadyLocked(bytes32 inventoryLockHash, uint256 tradeId);
    error FingerprintChallengeActive(bytes32 challengeHash);
    error FingerprintChallengeMissing();
    error UnapprovedVerifierScope(address verifier, bytes32 scopeSetHash);
    error AttestationSubjectMissing(bytes32 subjectHash);
    error ChallengeAttestationMissing(bytes32 attestationHash);
    error ChallengeAttestationSubjectMismatch(bytes32 expectedSubjectHash, bytes32 providedSubjectHash);
    error ChallengeResolutionScopeRequired();
    error ChallengeAttestationScopeMismatch(bytes32 expectedScopeSetHash, bytes32 providedScopeSetHash);
    error JudgmentSupplyRequired();
    error JscVerifierRouteRequired();
    error JscVerifierRouteAcceptanceRequired();
    error JscVerifierRouteMismatch(bytes32 expectedRouteHash, bytes32 providedRouteHash);
    error JscScopeMismatch(bytes32 expectedScopeHash, bytes32 providedScopeHash);
    error VerifierSettlementNotAuthorized();
    error VerifierBondRequired(uint256 requiredAmount, uint256 lockedAmount);
    error VerifierBondReleasePending(uint256 availableAt);
    error JudgmentAuthorityConflict(address authority);
    error FloorJudgmentRouteRequired();
    error FloorJudgmentRouteAlreadyCommitted();
    error FloorPanelMemberRequired(address authority);
    error FloorPanelQuorumRequired(uint256 requiredSignatures, uint256 providedSignatures);
    error DuplicatePanelSigner(address signer);
    error FloorAppealWindowOpen(uint256 availableAt);
    error FloorResolutionTimeoutOpen(uint256 availableAt);
    error PostDeliveryDefaultRequiresFloorReceipt();
    error PostDeliveryClaimRequired();
    error SpendabilityRequired();
    error SpendabilityAlreadyConsumed(bytes32 spendabilityHash);
    error SpendabilityDigestMismatch(bytes32 expectedSpendabilityHash, bytes32 providedSpendabilityHash);
    error WallBundleRequired();
    error AssemblyHistoryRequired();
    error RouteAssemblyWitnessRequired();
    error RouteAssemblyWitnessMismatch(bytes32 expectedWitnessHash, bytes32 providedWitnessHash);
    error DeliveryWitnessRequired();
    error DeliveryWitnessMismatch(bytes32 expectedDeliveryWitnessHash, bytes32 providedDeliveryWitnessHash);
    error AlphaAdmissionPolicyRequired();
    error AlphaAdmissionPolicyRejected(bytes32 policyHash);
    error DeliveryPolicyRequired();
    error DeliveryPolicyRejected(bytes32 policyHash);
    error PostHandoffRemedyRequired();
    error PostHandoffRemedyRejected(bytes32 remedyHash);
    error TypedSpendabilityRequired();
    error TypedSpendabilityRejected(bytes32 spendabilityHash);

    uint256 public nextTradeId = 1;
    IMarketplaceActorRegistry public immutable actorRegistry;
    uint64 public constant ALPHA_POLICY_VERSION = 1;
    bytes32 public constant ROUTE_COMMITMENT_GATE = keccak256("marketplace.gate.route_commitment.v0.1");
    bytes32 public constant DELIVERY_CONFIRMATION_GATE = keccak256("marketplace.gate.delivery_confirmation.v0.1");
    bytes32 public constant ROUTE_COMMITMENT_LEG = keccak256("marketplace.leg.route_commitment.v0.1");
    bytes32 public constant DELIVERY_CONFIRMATION_LEG = keccak256("marketplace.leg.delivery_confirmation.v0.1");
    bytes32 public constant FINGERPRINT_SCOPE_SET_HASH = keccak256("marketplace.scope_set.item_fingerprint.v0.1");
    bytes32 public constant APPEAL_FINAL_STATE_HASH = keccak256("marketplace.appeal_state.final.v0.1");
    bytes32 public constant MODEL_OUTPUT_SOURCE_BASIS_HASH = keccak256("marketplace.source_basis.model_output.v0.1");
    bytes32 public constant REPUTATION_SCORE_SOURCE_BASIS_HASH =
        keccak256("marketplace.source_basis.reputation_score.v0.1");
    bytes32 public constant SUMMARY_SOURCE_BASIS_HASH = keccak256("marketplace.source_basis.summary.v0.1");
    bytes32 public constant ALPHA_ADMISSION_POLICY_TYPEHASH = keccak256(
        "AlphaAdmissionPolicy(address escrow,uint256 chainId,uint256 tradeId,bytes32 policyHash,address policyAuthority,uint64 version,uint64 effectiveBlock,bytes32 routeClass,uint256 maxTradeValue,uint256 principalExposureAfter,uint256 maxPrincipalExposure,bytes32 controlClusterId,uint256 controlClusterExposureAfter,uint256 maxControlClusterExposure,bytes32 custodianId,uint256 custodianExposureAfter,uint256 maxCustodianExposure,address verifier,uint256 verifierExposureAfter,uint256 maxVerifierExposure,address judgmentAuthority,uint256 judgmentAuthorityExposureAfter,uint256 maxJudgmentAuthorityExposure,bytes32 registryVersionHash,uint256 registryVersionExposureAfter,uint256 maxRegistryVersionExposure,uint64 epochId,uint256 globalEpochLossAfter,uint256 maxGlobalEpochLoss,bytes32 deliveryMode,bytes32 disputeBranch,bool manualOverride,address manualAuthority,address manualSecondApprover,bytes32 manualReasonHash,uint256 manualOverrideLoss,uint256 manualRemainingLossBudget)"
    );
    bytes32 public constant SPENDABILITY_DIGEST_TYPEHASH = keccak256(
        "SpendabilityDigest(address escrow,uint256 chainId,uint256 tradeId,bytes32 gateHash,bytes32 legHash,bytes32 boundArtifactsHash,address issuer)"
    );
    bytes32 public constant TYPED_SPENDABILITY_DIGEST_TYPEHASH = keccak256(
        "TypedSpendabilityDigest(address escrow,uint256 chainId,uint256 tradeId,bytes32 gateHash,bytes32 legHash,bytes32 boundArtifactsHash,address issuer,bytes32 canonicalPreimageHash,bytes32 constituentClaimsHash,bytes32 sourceClaimsAvailabilityHash,bytes32 validatorCodeHash,bytes32 validatorPolicyHash,bytes32 issuerRoleHash,uint8 issuerAuthorityCeiling,bytes32 issuerConflictRef,bytes32 registrySnapshotHash,uint64 expiryBlock,bytes32 dataAvailabilityHash,bytes32 preimageAvailabilityHash,bytes32 notClaimingHash,bytes32 sourceBasisHash,address sourceClaimAuthor,bool downgraded,bool valueCapped)"
    );
    bytes32 public constant INVENTORY_LOCK_BINDING_TYPEHASH = keccak256(
        "InventoryLockBinding(address escrow,uint256 chainId,uint256 tradeId,bytes32 inventoryLockHash,bytes32 itemFingerprintHash)"
    );
    bytes32 public constant VERIFIER_SCOPE_APPROVAL_TYPEHASH = keccak256(
        "VerifierScopeApproval(address escrow,uint256 chainId,uint256 tradeId,address verifier,bytes32 scopeSetHash,bytes32 approvalHash)"
    );
    bytes32 public constant VERIFIER_ATTESTATION_TYPEHASH = keccak256(
        "VerifierAttestation(address escrow,uint256 chainId,uint256 tradeId,bytes32 attestationHash,bytes32 subjectHash,bytes32 scopeSetHash,bytes32 methodIdHash)"
    );
    bytes32 public constant FINGERPRINT_CHALLENGE_RESOLUTION_TYPEHASH = keccak256(
        "FingerprintChallengeResolution(address escrow,uint256 chainId,uint256 tradeId,bytes32 resolutionHash,bytes32 challengeHash,bytes32 attestationHash)"
    );
    bytes32 public constant FLOOR_RULING_TYPEHASH = keccak256(
        "FloorRuling(address escrow,uint256 chainId,uint256 tradeId,bytes32 rulingHash,bytes32 jscHash,address floorExecutor,uint16 buyerRefundBps,uint16 sellerBondPenaltyBps,bool returnDisputeBondToBuyer)"
    );
    bytes32 public constant UNRESOLVABLE_CLAIM_RECEIPT_TYPEHASH = keccak256(
        "UnresolvableClaimReceipt(address escrow,uint256 chainId,uint256 tradeId,bytes32 rulingHash,bytes32 receiptHash,bytes32 jscHash,address floorExecutor)"
    );
    bytes32 public constant FLOOR_JUDGMENT_ROUTE_TYPEHASH = keccak256(
        "FloorJudgmentRoute(address escrow,uint256 chainId,uint256 tradeId,bytes32 jscHash,address floorExecutor,bytes32 panelMembersHash,uint8 requiredSignatures,uint64 appealWindowSeconds,bytes32 appealAuthorityHash,bytes32 panelMetadataHash)"
    );
    bytes32 public constant JSC_VERIFIER_ROUTE_TYPEHASH = keccak256(
        "JudgmentSupplyVerifierRoute(address escrow,uint256 chainId,uint256 tradeId,bytes32 jscHash,uint8 routeClass,uint8 authorityLevel,address acceptedVerifier,bytes32 scopeHash,bytes32 evidenceFloorHash,bytes32 feeScheduleHash,uint8 feePayer,bool feeOutcomeIndependent,uint256 buyerDisputeBondRequired,uint256 verifierBondRequired,uint256 verifierExposureCap,uint64 verifierBondTailSeconds,bytes32 appealHash,bool witnessCanSettle)"
    );
    bytes32 public constant JSC_VERIFIER_ROUTE_ACCEPTANCE_TYPEHASH = keccak256(
        "JudgmentSupplyVerifierRouteAcceptance(address escrow,uint256 chainId,uint256 tradeId,bytes32 jscHash,bytes32 routeHash,address seller)"
    );
    bytes32 public constant VERIFIER_SETTLEMENT_RULING_TYPEHASH = keccak256(
        "VerifierSettlementRuling(address escrow,uint256 chainId,uint256 tradeId,bytes32 rulingHash,bytes32 claimHash,bytes32 jscHash,bytes32 verifierRouteHash,address acceptedVerifier,bytes32 scopeHash,uint16 buyerRefundBps,uint16 sellerBondPenaltyBps,bool returnDisputeBondToBuyer)"
    );
    bytes32 public constant ROUTE_ASSEMBLY_WITNESS_TYPEHASH = keccak256(
        "RouteAssemblyWitness(address escrow,uint256 chainId,uint256 tradeId,bytes32 routeHash,bytes32 routeSpendabilityHash,bytes32 wallBundleHash,bytes32 assemblyHistoryHash,bytes32 itemFingerprintHash,bytes32 inventoryLockHash,bytes32 gateHash)"
    );
    bytes32 public constant DELIVERY_WITNESS_TYPEHASH = keccak256(
        "DeliveryWitness(address escrow,uint256 chainId,uint256 tradeId,bytes32 routeHash,bytes32 deliveryHash,bytes32 spendabilityHash,bytes32 gateHash)"
    );
    bytes32 public constant DELIVERY_TRIGGER_POLICY_TYPEHASH = keccak256(
        "DeliveryTriggerPolicy(address escrow,uint256 chainId,uint256 tradeId,bytes32 routeHash,bytes32 policyHash,bytes32 witnessClassHash,address witnessIssuer,bytes32 issuerConflictRef,bytes32 scopeHash,uint64 expiryBlock,uint64 challengeDeadlineBlock,uint256 settlementCeiling,bool sellerAssociated,uint8 independentWitnessCount,bool missingWitnessCanEstablishNonDelivery)"
    );
    bytes32 public constant POST_HANDOFF_REMEDY_TYPEHASH = keccak256(
        "PostHandoffRemedy(address escrow,uint256 chainId,uint256 tradeId,bytes32 claimHash,bytes32 claimTypeHash,bytes32 remedyTypeHash,uint256 maxAmount,bool returnRequired,bytes32 returnCustodyHash,bytes32 evidenceRoot,bytes32 appealFinalStateHash,bool nonReturnRemedyAllowed)"
    );

    mapping(uint256 tradeId => Trade) public trades;
    mapping(uint256 tradeId => mapping(bytes32 proposalHash => ArbiterReplacement)) public arbiterReplacementApprovals;
    mapping(uint256 tradeId => mapping(uint256 index => bytes32 hash)) public proofHashes;
    mapping(uint256 tradeId => mapping(uint256 index => bytes32 hash)) public evidenceHashes;
    mapping(uint256 tradeId => mapping(bytes32 packetHash => bool anchored)) public anchoredPacketHashes;
    mapping(uint256 tradeId => mapping(bytes32 spendabilityHash => bool consumed)) public consumedSpendabilityHashes;
    mapping(uint256 tradeId => mapping(address authority => bool member)) public floorPanelMembers;
    mapping(uint256 tradeId => mapping(address verifier => bool approved)) public approvedFingerprintVerifiers;
    mapping(uint256 tradeId => mapping(address verifier => mapping(bytes32 scopeSetHash => bool approved))) public
        approvedVerifierScopes;
    mapping(uint256 tradeId => mapping(uint256 index => bytes32 hash)) public verifierAttestationHashes;
    mapping(uint256 tradeId => mapping(bytes32 attestationHash => VerifierAttestation attestation)) public
        verifierAttestations;
    mapping(bytes32 itemFingerprintHash => uint256 tradeId) public activeItemFingerprints;
    mapping(bytes32 inventoryLockHash => uint256 tradeId) public activeInventoryLocks;
    mapping(address principal => uint256 exposure) public alphaPrincipalExposure;
    mapping(bytes32 controlClusterId => uint256 exposure) public alphaControlClusterExposure;
    mapping(bytes32 custodianId => uint256 exposure) public alphaCustodianExposure;
    mapping(address verifier => uint256 exposure) public alphaVerifierExposure;
    mapping(address judgmentAuthority => uint256 exposure) public alphaJudgmentAuthorityExposure;
    mapping(bytes32 registryVersionHash => uint256 exposure) public alphaRegistryVersionExposure;
    mapping(uint64 epochId => uint256 exposure) public alphaEpochExposure;

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address arbiter,
        uint256 escrowAmount,
        uint256 sellerBondRequired,
        uint256 disputeBondRequired,
        bytes32 intentHash,
        bytes32 termsHash,
        bytes32 jscHash,
        address floorExecutor
    );
    event TradeCancelled(uint256 indexed tradeId, bytes32 reasonHash);
    event SellerBonded(uint256 indexed tradeId, uint256 sellerBondLocked);
    event ProofAttached(uint256 indexed tradeId, address indexed issuer, uint256 index, bytes32 proofHash);
    event EvidenceAttached(
        uint256 indexed tradeId, address indexed issuer, EvidenceKind kind, uint256 index, bytes32 evidenceHash
    );
    event PredicateEvidenceAttached(
        uint256 indexed tradeId,
        address indexed issuer,
        address indexed predicateVerifier,
        EvidenceKind kind,
        uint256 index,
        bytes32 predicateHash
    );
    event ItemFingerprintCommitted(uint256 indexed tradeId, address indexed issuer, bytes32 itemFingerprintHash);
    event FingerprintVerifierApproved(
        uint256 indexed tradeId, address indexed buyer, address indexed verifier, bytes32 approvalHash
    );
    event VerifierScopeApproved(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed verifier,
        bytes32 scopeSetHash,
        bytes32 approvalHash
    );
    event VerifierAttestationCommitted(
        uint256 indexed tradeId,
        address indexed verifier,
        uint256 index,
        bytes32 attestationHash,
        bytes32 subjectHash,
        bytes32 scopeSetHash,
        bytes32 methodIdHash
    );
    event ItemFingerprintReleased(uint256 indexed tradeId, bytes32 itemFingerprintHash);
    event InventoryLocked(uint256 indexed tradeId, bytes32 inventoryLockHash, bytes32 boundItemFingerprintHash);
    event InventoryLockReleased(uint256 indexed tradeId, bytes32 inventoryLockHash);
    event FingerprintChallengeOpened(
        uint256 indexed tradeId, address indexed challenger, bytes32 challengeHash, bytes32 allowedResolutionScopeHash
    );
    event FingerprintChallengeCleared(uint256 indexed tradeId, address indexed issuer, bytes32 resolutionHash);
    event FingerprintChallengeClearedWithAttestation(
        uint256 indexed tradeId, address indexed issuer, bytes32 resolutionHash, bytes32 attestationHash
    );
    event RouteCommitted(
        uint256 indexed tradeId,
        bytes32 routeHash,
        bytes32 wallBundleHash,
        bool inPersonAllowed,
        bool insured,
        uint256 declaredInsurance
    );
    event RouteWallBundleCommitted(
        uint256 indexed tradeId, bytes32 indexed wallBundleHash, bytes32 indexed spendabilityHash
    );
    event RouteAssemblyCommitted(
        uint256 indexed tradeId,
        bytes32 indexed routeSpendabilityHash,
        bytes32 indexed assemblyHistoryHash,
        bytes32 wallBundleHash,
        bytes32 routeAssemblyWitnessHash
    );
    event SpendabilityConsumed(uint256 indexed tradeId, bytes32 indexed spendabilityHash, bytes32 indexed gateHash);
    event RouteInProgress(uint256 indexed tradeId);
    event DeliveryWitnessCommitted(
        uint256 indexed tradeId, bytes32 indexed deliveryWitnessHash, bytes32 indexed spendabilityHash
    );
    event AlphaAdmissionPolicyCommitted(
        uint256 indexed tradeId, bytes32 indexed policyHash, uint64 version, bytes32 snapshotHash
    );
    event AlphaExposureReserved(uint256 indexed tradeId, bytes32 indexed policyHash, uint256 amount);
    event AlphaExposureReleased(uint256 indexed tradeId, bytes32 indexed policyHash);
    event DeliveryPolicyCommitted(uint256 indexed tradeId, bytes32 indexed policyHash, bytes32 indexed scopeHash);
    event PostHandoffRemedyCommitted(uint256 indexed tradeId, bytes32 indexed remedyHash, uint256 maxAmount);
    event InspectionOpened(
        uint256 indexed tradeId, bytes32 deliveryHash, uint256 deliveredAt, uint256 inspectionDeadline
    );
    event RouteClaimOpened(uint256 indexed tradeId, bytes32 claimHash, uint256 disputeBondLocked);
    event BuyerAccepted(uint256 indexed tradeId, bytes32 receiptHash);
    event ClaimOpened(uint256 indexed tradeId, bytes32 claimHash, uint256 disputeBondLocked);
    event JscVerifierRouteCommitted(
        uint256 indexed tradeId,
        bytes32 indexed routeHash,
        VerifierRouteClass routeClass,
        VerifierAuthorityLevel authorityLevel,
        address indexed acceptedVerifier,
        bytes32 scopeHash,
        bytes32 appealHash
    );
    event FloorJudgmentRouteCommitted(
        uint256 indexed tradeId,
        bytes32 indexed routeHash,
        bytes32 indexed panelMembersHash,
        uint8 requiredSignatures,
        uint64 appealWindowSeconds,
        bytes32 appealAuthorityHash
    );
    event JscVerifierRouteAccepted(uint256 indexed tradeId, bytes32 indexed routeHash);
    event VerifierSettlementBondLocked(uint256 indexed tradeId, address indexed verifier, uint256 amount);
    event VerifierSettlementBondWithdrawn(uint256 indexed tradeId, address indexed verifier, uint256 amount);
    event FloorClaimResolved(
        uint256 indexed tradeId,
        address indexed floorExecutor,
        bytes32 rulingHash,
        uint256 buyerRefund,
        uint256 sellerEscrowPayout,
        uint256 sellerBondPenalty,
        bool disputeBondReturnedToBuyer
    );
    event DefaultClaimResolved(
        uint256 indexed tradeId,
        bytes32 rulingHash,
        uint256 buyerRefund,
        uint256 sellerEscrowPayout,
        uint256 sellerBondPenalty,
        bool disputeBondReturnedToBuyer
    );
    event VerifierClaimResolved(
        uint256 indexed tradeId,
        address indexed verifier,
        bytes32 rulingHash,
        uint256 buyerRefund,
        uint256 sellerEscrowPayout,
        uint256 sellerBondPenalty,
        bool disputeBondReturnedToBuyer
    );
    event ClaimResolved(
        uint256 indexed tradeId,
        bytes32 rulingHash,
        uint256 buyerRefund,
        uint256 sellerEscrowPayout,
        uint256 sellerBondPenalty,
        bool disputeBondReturnedToBuyer
    );
    event ArbiterReplacementApproved(
        uint256 indexed tradeId, address indexed approver, address indexed proposedArbiter, bytes32 proposalHash
    );
    event ArbiterReplaced(
        uint256 indexed tradeId, address indexed oldArbiter, address indexed newArbiter, bytes32 proposalHash
    );
    event EmergencyArbiterReplaced(
        uint256 indexed tradeId, address indexed oldArbiter, address indexed newArbiter, bytes32 proposalHash
    );
    event TradeSettled(uint256 indexed tradeId);

    constructor(address actorRegistry_) {
        if (actorRegistry_ == address(0)) revert BadAddress();
        actorRegistry = IMarketplaceActorRegistry(actorRegistry_);
    }

    modifier onlyBuyer(uint256 tradeId) {
        if (msg.sender != trades[tradeId].buyer) revert Unauthorized();
        _;
    }

    modifier onlySeller(uint256 tradeId) {
        if (msg.sender != trades[tradeId].seller) revert Unauthorized();
        _;
    }

    modifier onlyArbiter(uint256 tradeId) {
        if (msg.sender != trades[tradeId].arbiter) revert Unauthorized();
        if (!actorRegistry.isArbiterActive(msg.sender)) revert UnregisteredArbiter(msg.sender);
        _;
    }

    modifier inState(uint256 tradeId, State expected) {
        State current = trades[tradeId].state;
        if (current != expected) revert BadState(current);
        _;
    }

    function createTrade(
        address,
        address,
        uint256,
        uint256,
        uint256,
        bytes32,
        bytes32,
        bytes32,
        address,
        bytes calldata,
        bytes calldata
    ) external payable returns (uint256) {
        revert AlphaAdmissionPolicyRequired();
    }

    function createTrade(
        address,
        address,
        uint256,
        uint256,
        uint256,
        bytes32,
        bytes32,
        bytes32,
        address,
        AlphaAdmissionPolicy calldata,
        bytes calldata,
        bytes calldata
    ) external payable returns (uint256) {
        revert AlphaAdmissionPolicyRequired();
    }

    function createTrade(
        address seller,
        address arbiter,
        uint256 sellerBondRequired,
        uint256 disputeBondRequired,
        uint256 inspectionSeconds,
        bytes32 intentHash,
        bytes32 termsHash,
        bytes32 jscHash,
        address floorExecutor,
        AlphaAdmissionPolicy calldata alphaPolicy,
        bytes calldata alphaPolicySignature,
        bytes calldata intentSignature,
        bytes calldata termsSignature
    ) external payable returns (uint256 tradeId) {
        if (seller == address(0) || arbiter == address(0) || floorExecutor == address(0) || seller == msg.sender) {
            revert BadAddress();
        }
        if (floorExecutor == msg.sender || floorExecutor == seller || floorExecutor == arbiter) {
            revert JudgmentAuthorityConflict(floorExecutor);
        }
        if (!actorRegistry.isActorActive(msg.sender, ROLE_BUYER)) {
            revert UnregisteredActor(msg.sender);
        }
        if (!actorRegistry.isActorActive(seller, ROLE_SELLER)) {
            revert UnregisteredActor(seller);
        }
        if (!actorRegistry.isArbiterActive(arbiter)) {
            revert UnregisteredArbiter(arbiter);
        }
        if (!actorRegistry.isArbiterActive(floorExecutor)) {
            revert UnregisteredArbiter(floorExecutor);
        }
        if (msg.value == 0 || sellerBondRequired == 0 || inspectionSeconds == 0) {
            revert BadAmount();
        }
        if (intentHash == bytes32(0) || termsHash == bytes32(0)) revert BadHash();
        if (jscHash == bytes32(0)) revert JudgmentSupplyRequired();
        _requireSignature(msg.sender, intentHash, intentSignature);
        _requireSignature(msg.sender, termsHash, termsSignature);

        tradeId = nextTradeId++;
        bytes32 alphaPolicySnapshotHash = alphaAdmissionPolicyHash(tradeId, alphaPolicy);
        _validateAlphaAdmissionPolicy(
            tradeId, msg.value, alphaPolicy, msg.sender, seller, arbiter, floorExecutor, alphaPolicySignature
        );
        trades[tradeId] = Trade({
            buyer: msg.sender,
            seller: seller,
            arbiter: arbiter,
            escrowAmount: msg.value,
            sellerBondRequired: sellerBondRequired,
            sellerBondLocked: 0,
            disputeBondRequired: disputeBondRequired,
            disputeBondLocked: 0,
            inspectionSeconds: inspectionSeconds,
            routeCommittedAt: 0,
            deliveredAt: 0,
            claimOpenedAt: 0,
            postDeliveryClaim: false,
            claimHash: bytes32(0),
            state: State.EscrowFunded,
            intentHash: intentHash,
            termsHash: termsHash,
            jscHash: jscHash,
            floorExecutor: floorExecutor,
            floorJudgmentRouteHash: bytes32(0),
            floorPanelMembersHash: bytes32(0),
            floorPanelSize: 0,
            floorRequiredSignatures: 0,
            floorAppealWindowSeconds: 0,
            floorAppealAuthorityHash: bytes32(0),
            floorPanelMetadataHash: bytes32(0),
            alphaPolicySnapshotHash: alphaPolicySnapshotHash,
            alphaPolicyVersion: alphaPolicy.version,
            alphaRouteClass: alphaPolicy.routeClass,
            alphaDeliveryMode: alphaPolicy.deliveryMode,
            alphaDisputeBranch: alphaPolicy.disputeBranch,
            alphaRegistryVersionHash: alphaPolicy.registryVersionHash,
            alphaEpochId: alphaPolicy.epochId,
            alphaPolicyHash: alphaPolicy.policyHash,
            alphaPolicyAuthority: alphaPolicy.policyAuthority,
            alphaControlClusterId: alphaPolicy.controlClusterId,
            alphaCustodianId: alphaPolicy.custodianId,
            alphaVerifier: alphaPolicy.verifier,
            alphaJudgmentAuthority: alphaPolicy.judgmentAuthority,
            alphaMaxVerifierExposure: alphaPolicy.maxVerifierExposure,
            alphaPrincipalExposureReserved: msg.value,
            alphaControlClusterExposureReserved: msg.value,
            alphaCustodianExposureReserved: msg.value,
            alphaVerifierExposureReserved: 0,
            alphaJudgmentAuthorityExposureReserved: msg.value,
            alphaRegistryVersionExposureReserved: msg.value,
            alphaEpochExposureReserved: msg.value,
            jscVerifierRouteHash: bytes32(0),
            verifierRouteClass: VerifierRouteClass.None,
            verifierAuthorityLevel: VerifierAuthorityLevel.None,
            acceptedVerifier: address(0),
            acceptedVerifierScopeHash: bytes32(0),
            verifierEvidenceFloorHash: bytes32(0),
            verifierFeeScheduleHash: bytes32(0),
            verifierFeePayer: FeePayer.None,
            verifierFeeOutcomeIndependent: false,
            jscBuyerDisputeBondRequired: 0,
            verifierBondRequired: 0,
            verifierBondLocked: 0,
            verifierBondOwner: address(0),
            verifierBondTailSeconds: 0,
            verifierBondReleaseAt: 0,
            verifierExposureCap: 0,
            verifierAppealHash: bytes32(0),
            verifierWitnessCanSettle: false,
            itemFingerprintHash: bytes32(0),
            inventoryLockHash: bytes32(0),
            fingerprintChallengeHash: bytes32(0),
            allowedChallengeResolutionScopeHash: bytes32(0),
            routeHash: bytes32(0),
            routeWallBundleHash: bytes32(0),
            routeSpendabilityHash: bytes32(0),
            routeAssemblyHistoryHash: bytes32(0),
            routeAssemblyWitnessHash: bytes32(0),
            deliveryHash: bytes32(0),
            deliveryWitnessHash: bytes32(0),
            deliveryPolicyHash: bytes32(0),
            receiptHash: bytes32(0),
            postHandoffRemedyHash: bytes32(0),
            postHandoffRemedyMaxAmount: 0,
            postHandoffReturnRequired: false,
            postHandoffReturnCustodyHash: bytes32(0),
            postHandoffEvidenceRoot: bytes32(0),
            postHandoffAppealFinalStateHash: bytes32(0),
            postHandoffNonReturnRemedyAllowed: false,
            proofCount: 0,
            evidenceCount: 0,
            verifierAttestationCount: 0,
            inPersonAllowed: false,
            insured: false,
            declaredInsurance: 0
        });
        _anchorPacketHash(tradeId, intentHash);
        _anchorPacketHash(tradeId, termsHash);
        _anchorPacketHash(tradeId, jscHash);
        _anchorPacketHash(tradeId, alphaPolicySnapshotHash);
        _reserveAlphaAdmissionExposure(tradeId, trades[tradeId]);

        emit TradeCreated(
            tradeId,
            msg.sender,
            seller,
            arbiter,
            msg.value,
            sellerBondRequired,
            disputeBondRequired,
            intentHash,
            termsHash,
            jscHash,
            floorExecutor
        );
        emit AlphaAdmissionPolicyCommitted(tradeId, alphaPolicy.policyHash, alphaPolicy.version, alphaPolicySnapshotHash);
    }

    function cancelBeforeSellerBond(uint256 tradeId, bytes32 reasonHash, bytes calldata reasonSignature)
        external
        onlyBuyer(tradeId)
        inState(tradeId, State.EscrowFunded)
    {
        if (reasonHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, reasonHash, reasonSignature);
        Trade storage trade = trades[tradeId];
        _anchorPacketHash(tradeId, reasonHash);
        uint256 refund = trade.escrowAmount;
        trade.state = State.Cancelled;
        _releaseTradeObjectLocks(tradeId);

        emit TradeCancelled(tradeId, reasonHash);
        _send(payable(trade.buyer), refund);
    }

    function acceptAndBond(uint256 tradeId) external payable onlySeller(tradeId) inState(tradeId, State.EscrowFunded) {
        Trade storage trade = trades[tradeId];
        if (trade.jscVerifierRouteHash != bytes32(0)) {
            revert JscVerifierRouteAcceptanceRequired();
        }
        _acceptAndBond(tradeId, trade);
    }

    function acceptAndBondWithJscVerifierRoute(uint256 tradeId, bytes32 routeHash, bytes calldata acceptanceSignature)
        external
        payable
        onlySeller(tradeId)
        inState(tradeId, State.EscrowFunded)
    {
        Trade storage trade = trades[tradeId];
        if (trade.jscVerifierRouteHash == bytes32(0)) revert JscVerifierRouteRequired();
        if (routeHash != trade.jscVerifierRouteHash) {
            revert JscVerifierRouteMismatch(trade.jscVerifierRouteHash, routeHash);
        }

        _requireSignature(msg.sender, jscVerifierRouteAcceptanceHash(tradeId, routeHash), acceptanceSignature);
        _anchorPacketHash(tradeId, jscVerifierRouteAcceptanceHash(tradeId, routeHash));
        _acceptAndBond(tradeId, trade);

        emit JscVerifierRouteAccepted(tradeId, routeHash);
    }

    function commitJscVerifierRoute(uint256 tradeId, JscVerifierRoute calldata route, bytes calldata routeSignature)
        external
        onlyBuyer(tradeId)
        inState(tradeId, State.EscrowFunded)
    {
        Trade storage trade = trades[tradeId];
        if (trade.jscVerifierRouteHash != bytes32(0)) revert DuplicatePacket(trade.jscVerifierRouteHash);
        bytes32 routeHash = jscVerifierRouteHash(tradeId, route);

        _validateJscVerifierRoute(tradeId, trade, route);
        _requireSignature(msg.sender, routeHash, routeSignature);
        _reserveAlphaVerifierExposure(trade, route.acceptedVerifier, route.verifierExposureCap);
        _anchorPacketHash(tradeId, routeHash);

        trade.jscVerifierRouteHash = routeHash;
        trade.verifierRouteClass = route.routeClass;
        trade.verifierAuthorityLevel = route.authorityLevel;
        trade.acceptedVerifier = route.acceptedVerifier;
        trade.acceptedVerifierScopeHash = route.scopeHash;
        trade.verifierEvidenceFloorHash = route.evidenceFloorHash;
        trade.verifierFeeScheduleHash = route.feeScheduleHash;
        trade.verifierFeePayer = route.feePayer;
        trade.verifierFeeOutcomeIndependent = route.feeOutcomeIndependent;
        trade.jscBuyerDisputeBondRequired = route.buyerDisputeBondRequired;
        trade.verifierBondRequired = route.verifierBondRequired;
        trade.verifierExposureCap = route.verifierExposureCap;
        trade.verifierBondTailSeconds = route.verifierBondTailSeconds;
        trade.verifierAppealHash = route.appealHash;
        trade.verifierWitnessCanSettle = route.witnessCanSettle;

        emit JscVerifierRouteCommitted(
            tradeId,
            routeHash,
            route.routeClass,
            route.authorityLevel,
            route.acceptedVerifier,
            route.scopeHash,
            route.appealHash
        );
    }

    function commitFloorJudgmentRoute(uint256 tradeId, FloorJudgmentRoute calldata route, bytes calldata routeSignature)
        external
        onlyBuyer(tradeId)
        inState(tradeId, State.EscrowFunded)
    {
        Trade storage trade = trades[tradeId];
        if (trade.floorJudgmentRouteHash != bytes32(0)) {
            revert FloorJudgmentRouteAlreadyCommitted();
        }

        _validateFloorJudgmentRoute(trade, route);
        bytes32 routeHash = floorJudgmentRouteHash(tradeId, route);
        bytes32 panelMembersHash = _floorPanelMembersHash(route.panelMembers);

        _requireSignature(msg.sender, routeHash, routeSignature);
        _anchorPacketHash(tradeId, routeHash);

        trade.floorJudgmentRouteHash = routeHash;
        trade.floorPanelMembersHash = panelMembersHash;
        trade.floorPanelSize = uint8(route.panelMembers.length);
        trade.floorRequiredSignatures = route.requiredSignatures;
        trade.floorAppealWindowSeconds = route.appealWindowSeconds;
        trade.floorAppealAuthorityHash = route.appealAuthorityHash;
        trade.floorPanelMetadataHash = route.panelMetadataHash;

        for (uint256 i = 0; i < route.panelMembers.length; ++i) {
            floorPanelMembers[tradeId][route.panelMembers[i]] = true;
        }

        emit FloorJudgmentRouteCommitted(
            tradeId,
            routeHash,
            panelMembersHash,
            route.requiredSignatures,
            route.appealWindowSeconds,
            route.appealAuthorityHash
        );
    }

    function lockVerifierSettlementBond(uint256 tradeId, bytes32 routeHash) external payable {
        Trade storage trade = trades[tradeId];
        _onlyOpen(trade);
        if (trade.jscVerifierRouteHash == bytes32(0)) revert JscVerifierRouteRequired();
        if (routeHash != trade.jscVerifierRouteHash) {
            revert JscVerifierRouteMismatch(trade.jscVerifierRouteHash, routeHash);
        }
        if (trade.state == State.EscrowFunded) revert BadState(trade.state);
        if (msg.sender != trade.acceptedVerifier) revert Unauthorized();
        if (!actorRegistry.isVerifierActive(msg.sender)) revert UnregisteredActor(msg.sender);
        if (trade.verifierBondRequired == 0) revert BadAmount();

        uint256 missingBond = trade.verifierBondRequired - trade.verifierBondLocked;
        if (missingBond == 0) revert BadAmount();
        if (msg.value != missingBond) revert WrongBondAmount();

        trade.verifierBondLocked += msg.value;
        trade.verifierBondOwner = msg.sender;

        emit VerifierSettlementBondLocked(tradeId, msg.sender, msg.value);
    }

    function withdrawVerifierSettlementBond(uint256 tradeId) external {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.verifierBondOwner) revert Unauthorized();
        if (trade.state != State.Settled && trade.state != State.Cancelled) {
            revert BadState(trade.state);
        }
        uint256 releaseAt = trade.verifierBondReleaseAt;
        if (releaseAt != 0 && block.timestamp <= releaseAt) {
            revert VerifierBondReleasePending(releaseAt);
        }

        uint256 bond = trade.verifierBondLocked;
        if (bond == 0) revert BadAmount();
        trade.verifierBondLocked = 0;
        trade.verifierBondReleaseAt = 0;

        emit VerifierSettlementBondWithdrawn(tradeId, msg.sender, bond);
        _send(payable(msg.sender), bond);
    }

    function attachProof(uint256 tradeId, bytes32 proofHash, bytes calldata proofSignature) external {
        Trade storage trade = trades[tradeId];
        _onlyParticipant(trade);
        _onlyOpen(trade);
        if (proofHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, proofHash, proofSignature);
        _anchorPacketHash(tradeId, proofHash);

        uint256 index = trade.proofCount++;
        proofHashes[tradeId][index] = proofHash;

        emit ProofAttached(tradeId, msg.sender, index, proofHash);
    }

    function attachEvidence(uint256 tradeId, EvidenceKind kind, bytes32 evidenceHash, bytes calldata evidenceSignature)
        external
    {
        Trade storage trade = trades[tradeId];
        _onlyParticipant(trade);
        _onlyOpen(trade);
        if (evidenceHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, evidenceHash, evidenceSignature);
        _anchorPacketHash(tradeId, evidenceHash);

        uint256 index = trade.evidenceCount++;
        evidenceHashes[tradeId][index] = evidenceHash;

        emit EvidenceAttached(tradeId, msg.sender, kind, index, evidenceHash);
    }

    function attachPredicateEvidence(
        uint256 tradeId,
        EvidenceKind kind,
        bytes32 predicateHash,
        bytes calldata predicateSignature,
        address predicateVerifier,
        bytes calldata publicInputs,
        bytes calldata proof
    ) external {
        Trade storage trade = trades[tradeId];
        _onlyParticipant(trade);
        _onlyOpen(trade);
        if (predicateHash == bytes32(0)) revert BadHash();
        if (!actorRegistry.isPredicateVerifierActive(predicateVerifier)) {
            revert UnregisteredPredicateVerifier(predicateVerifier);
        }
        _requireSignature(msg.sender, predicateHash, predicateSignature);
        if (!IMarketplacePredicateVerifier(predicateVerifier).verifyPredicate(predicateHash, publicInputs, proof)) {
            revert PredicateVerificationFailed(predicateVerifier, predicateHash);
        }
        _anchorPacketHash(tradeId, predicateHash);

        uint256 index = trade.evidenceCount++;
        evidenceHashes[tradeId][index] = predicateHash;

        emit EvidenceAttached(tradeId, msg.sender, kind, index, predicateHash);
        emit PredicateEvidenceAttached(tradeId, msg.sender, predicateVerifier, kind, index, predicateHash);
    }

    function commitItemFingerprint(
        uint256 tradeId,
        bytes32 itemFingerprintHash,
        bytes calldata itemFingerprintSignature
    ) external inState(tradeId, State.EvidencePending) {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.seller) {
            if (!actorRegistry.isVerifierActive(msg.sender)) revert Unauthorized();
            if (!approvedVerifierScopes[tradeId][msg.sender][FINGERPRINT_SCOPE_SET_HASH]) {
                revert UnapprovedFingerprintVerifier(msg.sender);
            }
        }
        if (itemFingerprintHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, itemFingerprintHash, itemFingerprintSignature);

        uint256 activeTradeId = activeItemFingerprints[itemFingerprintHash];
        if (activeTradeId != 0 && activeTradeId != tradeId) {
            revert ItemFingerprintAlreadyLocked(itemFingerprintHash, activeTradeId);
        }
        if (trade.itemFingerprintHash != bytes32(0) && trade.itemFingerprintHash != itemFingerprintHash) {
            revert DuplicatePacket(trade.itemFingerprintHash);
        }

        _anchorPacketHash(tradeId, itemFingerprintHash);
        trade.itemFingerprintHash = itemFingerprintHash;
        activeItemFingerprints[itemFingerprintHash] = tradeId;

        emit ItemFingerprintCommitted(tradeId, msg.sender, itemFingerprintHash);
    }

    function approveFingerprintVerifier(
        uint256 tradeId,
        address verifier,
        bytes32 approvalHash,
        bytes calldata approvalSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EvidencePending) {
        _approveVerifierScope(tradeId, verifier, FINGERPRINT_SCOPE_SET_HASH, approvalHash, approvalSignature);
        emit FingerprintVerifierApproved(tradeId, msg.sender, verifier, approvalHash);
    }

    function approveVerifierScope(
        uint256 tradeId,
        address verifier,
        bytes32 scopeSetHash,
        bytes32 approvalHash,
        bytes calldata approvalSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EvidencePending) {
        _approveVerifierScope(tradeId, verifier, scopeSetHash, approvalHash, approvalSignature);
    }

    function commitVerifierAttestation(
        uint256 tradeId,
        bytes32 attestationHash,
        bytes32 subjectHash,
        bytes32 scopeSetHash,
        bytes32 methodIdHash,
        bytes calldata attestationSignature
    ) external {
        Trade storage trade = trades[tradeId];
        _onlyOpen(trade);
        if (!actorRegistry.isVerifierActive(msg.sender)) revert Unauthorized();
        if (!approvedVerifierScopes[tradeId][msg.sender][scopeSetHash]) {
            revert UnapprovedVerifierScope(msg.sender, scopeSetHash);
        }
        if (
            attestationHash == bytes32(0) || subjectHash == bytes32(0) || scopeSetHash == bytes32(0)
                || methodIdHash == bytes32(0)
        ) {
            revert BadHash();
        }
        if (!anchoredPacketHashes[tradeId][subjectHash]) {
            revert AttestationSubjectMissing(subjectHash);
        }

        _requireSignature(
            msg.sender,
            verifierAttestationBindingHash(tradeId, attestationHash, subjectHash, scopeSetHash, methodIdHash),
            attestationSignature
        );
        _anchorPacketHash(tradeId, attestationHash);

        uint256 index = trade.verifierAttestationCount++;
        verifierAttestationHashes[tradeId][index] = attestationHash;
        verifierAttestations[tradeId][attestationHash] = VerifierAttestation({
            verifier: msg.sender, subjectHash: subjectHash, scopeSetHash: scopeSetHash, methodIdHash: methodIdHash
        });

        emit VerifierAttestationCommitted(
            tradeId, msg.sender, index, attestationHash, subjectHash, scopeSetHash, methodIdHash
        );
    }

    function _approveVerifierScope(
        uint256 tradeId,
        address verifier,
        bytes32 scopeSetHash,
        bytes32 approvalHash,
        bytes calldata approvalSignature
    ) internal {
        if (!actorRegistry.isVerifierActive(verifier)) {
            revert UnregisteredActor(verifier);
        }
        if (scopeSetHash == bytes32(0)) revert BadHash();
        if (approvalHash == bytes32(0)) revert BadHash();
        _requireSignature(
            msg.sender, verifierScopeApprovalHash(tradeId, verifier, scopeSetHash, approvalHash), approvalSignature
        );
        _anchorPacketHash(tradeId, approvalHash);

        approvedVerifierScopes[tradeId][verifier][scopeSetHash] = true;
        if (scopeSetHash == FINGERPRINT_SCOPE_SET_HASH) {
            approvedFingerprintVerifiers[tradeId][verifier] = true;
        }

        emit VerifierScopeApproved(tradeId, msg.sender, verifier, scopeSetHash, approvalHash);
    }

    function commitInventoryLock(
        uint256 tradeId,
        bytes32 inventoryLockHash,
        bytes32 boundItemFingerprintHash,
        bytes calldata inventoryLockSignature
    ) external onlySeller(tradeId) inState(tradeId, State.EvidencePending) {
        if (inventoryLockHash == bytes32(0)) revert BadHash();

        uint256 activeTradeId = activeInventoryLocks[inventoryLockHash];
        if (activeTradeId != 0 && activeTradeId != tradeId) {
            revert InventoryAlreadyLocked(inventoryLockHash, activeTradeId);
        }

        Trade storage trade = trades[tradeId];
        if (trade.itemFingerprintHash == bytes32(0)) revert ItemFingerprintMissing();
        if (boundItemFingerprintHash != trade.itemFingerprintHash) {
            revert InventoryLockFingerprintMismatch(trade.itemFingerprintHash, boundItemFingerprintHash);
        }
        _requireSignature(
            msg.sender,
            inventoryLockBindingHash(tradeId, inventoryLockHash, boundItemFingerprintHash),
            inventoryLockSignature
        );
        if (trade.inventoryLockHash != bytes32(0) && trade.inventoryLockHash != inventoryLockHash) {
            revert DuplicatePacket(trade.inventoryLockHash);
        }
        _anchorPacketHash(tradeId, inventoryLockHash);
        trade.inventoryLockHash = inventoryLockHash;
        activeInventoryLocks[inventoryLockHash] = tradeId;

        emit InventoryLocked(tradeId, inventoryLockHash, boundItemFingerprintHash);
    }

    function openFingerprintChallenge(uint256, bytes32, bytes calldata) external pure {
        revert ChallengeResolutionScopeRequired();
    }

    function openFingerprintChallenge(
        uint256 tradeId,
        bytes32 challengeHash,
        bytes32 allowedResolutionScopeHash,
        bytes calldata challengeSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EvidencePending) {
        Trade storage trade = trades[tradeId];
        if (trade.itemFingerprintHash == bytes32(0)) revert ItemFingerprintMissing();
        if (challengeHash == bytes32(0)) revert BadHash();
        if (allowedResolutionScopeHash == bytes32(0)) {
            revert ChallengeResolutionScopeRequired();
        }
        if (trade.fingerprintChallengeHash != bytes32(0)) {
            revert FingerprintChallengeActive(trade.fingerprintChallengeHash);
        }
        _requireSignature(msg.sender, challengeHash, challengeSignature);
        _anchorPacketHash(tradeId, challengeHash);

        trade.fingerprintChallengeHash = challengeHash;
        trade.allowedChallengeResolutionScopeHash = allowedResolutionScopeHash;

        emit FingerprintChallengeOpened(tradeId, msg.sender, challengeHash, allowedResolutionScopeHash);
    }

    function clearFingerprintChallenge(uint256 tradeId, bytes32 resolutionHash, bytes calldata resolutionSignature)
        external
        onlyBuyer(tradeId)
        inState(tradeId, State.EvidencePending)
    {
        Trade storage trade = trades[tradeId];
        if (trade.fingerprintChallengeHash == bytes32(0)) revert FingerprintChallengeMissing();
        if (resolutionHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, resolutionHash, resolutionSignature);
        _anchorPacketHash(tradeId, resolutionHash);

        trade.fingerprintChallengeHash = bytes32(0);
        trade.allowedChallengeResolutionScopeHash = bytes32(0);

        emit FingerprintChallengeCleared(tradeId, msg.sender, resolutionHash);
    }

    function clearFingerprintChallengeWithAttestation(
        uint256 tradeId,
        bytes32 resolutionHash,
        bytes32 attestationHash,
        bytes calldata resolutionSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EvidencePending) {
        Trade storage trade = trades[tradeId];
        bytes32 challengeHash = trade.fingerprintChallengeHash;
        if (challengeHash == bytes32(0)) revert FingerprintChallengeMissing();
        if (resolutionHash == bytes32(0) || attestationHash == bytes32(0)) revert BadHash();

        VerifierAttestation storage attestation = verifierAttestations[tradeId][attestationHash];
        if (attestation.verifier == address(0)) {
            revert ChallengeAttestationMissing(attestationHash);
        }
        if (attestation.subjectHash != challengeHash) {
            revert ChallengeAttestationSubjectMismatch(challengeHash, attestation.subjectHash);
        }
        bytes32 allowedResolutionScopeHash = trade.allowedChallengeResolutionScopeHash;
        if (allowedResolutionScopeHash == bytes32(0)) {
            revert ChallengeResolutionScopeRequired();
        }
        if (attestation.scopeSetHash != allowedResolutionScopeHash) {
            revert ChallengeAttestationScopeMismatch(allowedResolutionScopeHash, attestation.scopeSetHash);
        }

        _requireSignature(
            msg.sender,
            fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, attestationHash),
            resolutionSignature
        );
        _anchorPacketHash(tradeId, resolutionHash);

        trade.fingerprintChallengeHash = bytes32(0);
        trade.allowedChallengeResolutionScopeHash = bytes32(0);

        emit FingerprintChallengeCleared(tradeId, msg.sender, resolutionHash);
        emit FingerprintChallengeClearedWithAttestation(tradeId, msg.sender, resolutionHash, attestationHash);
    }

    function commitRoute(uint256, bytes32, bool, bool, uint256, bytes calldata) external pure {
        revert SpendabilityRequired();
    }

    function commitRoute(uint256, bytes32, bytes32, bool, bool, uint256, bytes calldata) external pure {
        revert WallBundleRequired();
    }

    function commitRoute(
        uint256,
        bytes32,
        bytes32 spendabilityHash,
        bytes32 wallBundleHash,
        bool,
        bool,
        uint256,
        bytes calldata
    ) external pure {
        if (spendabilityHash == bytes32(0)) revert SpendabilityRequired();
        if (wallBundleHash == bytes32(0)) revert WallBundleRequired();
        revert AssemblyHistoryRequired();
    }

    function commitRoute(
        uint256,
        bytes32,
        bytes32,
        bytes32,
        bytes32,
        bytes32,
        bool,
        bool,
        uint256,
        bytes calldata
    ) external pure {
        revert TypedSpendabilityRequired();
    }

    function commitRoute(
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 spendabilityHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash,
        bytes32 routeAssemblyWitnessHash_,
        bool inPersonAllowed,
        bool insured,
        uint256 declaredInsurance,
        TypedSpendability calldata typedSpendability,
        bytes calldata routeSignature
    ) external onlySeller(tradeId) inState(tradeId, State.EvidencePending) {
        if (routeHash == bytes32(0)) revert BadHash();
        if (wallBundleHash == bytes32(0)) revert WallBundleRequired();
        if (assemblyHistoryHash == bytes32(0)) revert AssemblyHistoryRequired();
        if (routeAssemblyWitnessHash_ == bytes32(0)) revert RouteAssemblyWitnessRequired();
        _requireSignature(msg.sender, routeHash, routeSignature);
        if (insured && declaredInsurance == 0) revert BadAmount();
        if (!insured && declaredInsurance != 0) revert BadAmount();

        Trade storage trade = trades[tradeId];
        if (trade.jscHash == bytes32(0)) revert JudgmentSupplyRequired();
        if (trade.inventoryLockHash == bytes32(0)) revert InventoryLockMissing();
        if (trade.fingerprintChallengeHash != bytes32(0)) {
            revert FingerprintChallengeActive(trade.fingerprintChallengeHash);
        }
        bytes32 expectedSpendabilityHash =
            routeSpendabilityHash(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        if (spendabilityHash != expectedSpendabilityHash) {
            revert SpendabilityDigestMismatch(expectedSpendabilityHash, spendabilityHash);
        }
        _validateTypedSpendability(trade, typedSpendability, msg.sender, 1, spendabilityHash);
        bytes32 expectedRouteAssemblyWitnessHash =
            routeAssemblyWitnessHash(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);
        if (routeAssemblyWitnessHash_ != expectedRouteAssemblyWitnessHash) {
            revert RouteAssemblyWitnessMismatch(expectedRouteAssemblyWitnessHash, routeAssemblyWitnessHash_);
        }
        _consumeSpendability(tradeId, spendabilityHash, ROUTE_COMMITMENT_GATE);
        _anchorPacketHash(tradeId, routeHash);
        _anchorPacketHash(tradeId, wallBundleHash);
        _anchorPacketHash(tradeId, assemblyHistoryHash);
        trade.routeHash = routeHash;
        trade.routeWallBundleHash = wallBundleHash;
        trade.routeSpendabilityHash = spendabilityHash;
        trade.routeAssemblyHistoryHash = assemblyHistoryHash;
        trade.routeAssemblyWitnessHash = routeAssemblyWitnessHash_;
        trade.routeCommittedAt = block.timestamp;
        trade.inPersonAllowed = inPersonAllowed;
        trade.insured = insured;
        trade.declaredInsurance = declaredInsurance;
        trade.state = State.RouteLocked;

        emit RouteCommitted(tradeId, routeHash, wallBundleHash, inPersonAllowed, insured, declaredInsurance);
        emit RouteWallBundleCommitted(tradeId, wallBundleHash, spendabilityHash);
        emit RouteAssemblyCommitted(
            tradeId, spendabilityHash, assemblyHistoryHash, wallBundleHash, routeAssemblyWitnessHash_
        );
    }

    function markRouteInProgress(uint256 tradeId) external onlySeller(tradeId) inState(tradeId, State.RouteLocked) {
        trades[tradeId].state = State.RouteInProgress;
        emit RouteInProgress(tradeId);
    }

    function markDelivered(uint256, bytes32, bytes calldata) external pure {
        revert SpendabilityRequired();
    }

    function markDelivered(uint256, bytes32, bytes32, bytes calldata) external pure {
        revert DeliveryWitnessRequired();
    }

    function markDelivered(
        uint256,
        bytes32,
        bytes32,
        bytes32,
        bytes calldata
    ) external pure {
        revert DeliveryPolicyRequired();
    }

    function markDelivered(
        uint256 tradeId,
        bytes32 deliveryHash,
        bytes32 spendabilityHash,
        bytes32 deliveryWitnessHash_,
        DeliveryTriggerPolicy calldata deliveryPolicy,
        TypedSpendability calldata typedSpendability,
        bytes calldata deliverySignature
    ) external {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.seller && msg.sender != trade.arbiter) revert Unauthorized();
        if (trade.state != State.RouteLocked && trade.state != State.RouteInProgress) {
            revert BadState(trade.state);
        }
        if (deliveryHash == bytes32(0)) revert BadHash();
        if (deliveryWitnessHash_ == bytes32(0)) revert DeliveryWitnessRequired();
        bytes32 expectedSpendabilityHash = deliverySpendabilityHash(tradeId, deliveryHash, typedSpendability);
        if (spendabilityHash != expectedSpendabilityHash) {
            revert SpendabilityDigestMismatch(expectedSpendabilityHash, spendabilityHash);
        }
        _validateDeliveryTriggerPolicy(trade, deliveryPolicy, msg.sender);
        _validateTypedSpendability(trade, typedSpendability, msg.sender, 1, spendabilityHash);
        bytes32 deliveryPolicyHash_ = deliveryTriggerPolicyHash(tradeId, deliveryPolicy);
        bytes32 expectedDeliveryWitnessHash = deliveryWitnessHash(tradeId, deliveryHash, spendabilityHash);
        if (deliveryWitnessHash_ != expectedDeliveryWitnessHash) {
            revert DeliveryWitnessMismatch(expectedDeliveryWitnessHash, deliveryWitnessHash_);
        }
        _requireSignature(msg.sender, deliveryHash, deliverySignature);
        _consumeSpendability(tradeId, spendabilityHash, DELIVERY_CONFIRMATION_GATE);
        _anchorPacketHash(tradeId, deliveryPolicyHash_);
        _anchorPacketHash(tradeId, deliveryHash);

        trade.deliveryHash = deliveryHash;
        trade.deliveryWitnessHash = deliveryWitnessHash_;
        trade.deliveryPolicyHash = deliveryPolicyHash_;
        trade.deliveredAt = block.timestamp;
        trade.state = State.InspectionOpen;

        emit DeliveryWitnessCommitted(tradeId, deliveryWitnessHash_, spendabilityHash);
        emit DeliveryPolicyCommitted(tradeId, deliveryPolicy.policyHash, deliveryPolicy.scopeHash);
        emit InspectionOpened(tradeId, deliveryHash, block.timestamp, block.timestamp + trade.inspectionSeconds);
    }

    function buyerAccept(uint256 tradeId, bytes32 receiptHash, bytes calldata receiptSignature)
        external
        onlyBuyer(tradeId)
        inState(tradeId, State.InspectionOpen)
    {
        if (receiptHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, receiptHash, receiptSignature);
        Trade storage trade = trades[tradeId];
        _anchorPacketHash(tradeId, receiptHash);

        trade.receiptHash = receiptHash;
        trade.state = State.Settled;
        _releaseTradeObjectLocks(tradeId);

        emit BuyerAccepted(tradeId, receiptHash);
        emit TradeSettled(tradeId);
        _send(payable(trade.seller), trade.escrowAmount + trade.sellerBondLocked);
    }

    function settleAfterInspection(uint256 tradeId) external inState(tradeId, State.InspectionOpen) {
        Trade storage trade = trades[tradeId];
        if (block.timestamp <= trade.deliveredAt + trade.inspectionSeconds) {
            revert InspectionWindowOpen();
        }

        trade.state = State.Settled;
        _releaseTradeObjectLocks(tradeId);

        emit TradeSettled(tradeId);
        _send(payable(trade.seller), trade.escrowAmount + trade.sellerBondLocked);
    }

    function openClaim(uint256 tradeId, bytes32 claimHash, bytes calldata claimSignature)
        external
        payable
        onlyBuyer(tradeId)
        inState(tradeId, State.InspectionOpen)
    {
        Trade storage trade = trades[tradeId];
        if (claimHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, claimHash, claimSignature);
        if (block.timestamp > trade.deliveredAt + trade.inspectionSeconds) {
            revert InspectionWindowClosed();
        }
        if (msg.value != trade.disputeBondRequired) revert WrongBondAmount();
        _anchorPacketHash(tradeId, claimHash);

        trade.disputeBondLocked = msg.value;
        trade.claimOpenedAt = block.timestamp;
        trade.postDeliveryClaim = true;
        trade.claimHash = claimHash;
        trade.state = State.ClaimOrDisputePending;

        emit ClaimOpened(tradeId, claimHash, msg.value);
    }

    function openRouteClaimAfterTimeout(uint256 tradeId, bytes32 claimHash, bytes calldata claimSignature)
        external
        payable
        onlyBuyer(tradeId)
    {
        Trade storage trade = trades[tradeId];
        if (trade.state != State.RouteLocked && trade.state != State.RouteInProgress) {
            revert BadState(trade.state);
        }
        if (claimHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, claimHash, claimSignature);

        uint256 availableAt = trade.routeCommittedAt + ROUTE_CLAIM_TIMEOUT;
        if (block.timestamp <= availableAt) revert RouteClaimTimeoutOpen(availableAt);
        if (msg.value != trade.disputeBondRequired) revert WrongBondAmount();
        _anchorPacketHash(tradeId, claimHash);

        trade.disputeBondLocked = msg.value;
        trade.claimOpenedAt = block.timestamp;
        trade.postDeliveryClaim = false;
        trade.claimHash = claimHash;
        trade.state = State.ClaimOrDisputePending;

        emit RouteClaimOpened(tradeId, claimHash, msg.value);
        emit ClaimOpened(tradeId, claimHash, msg.value);
    }

    function commitPostHandoffRemedy(
        uint256 tradeId,
        PostHandoffRemedy calldata remedy,
        bytes calldata remedySignature
    ) external inState(tradeId, State.ClaimOrDisputePending) {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (!trade.postDeliveryClaim) revert PostDeliveryClaimRequired();
        if (trade.postHandoffRemedyHash != bytes32(0)) revert DuplicatePacket(trade.postHandoffRemedyHash);

        bytes32 remedyHash = postHandoffRemedyHash(tradeId, remedy);
        _validatePostHandoffRemedy(remedy, remedyHash);
        _requireSignature(msg.sender, remedyHash, remedySignature);
        _anchorPacketHash(tradeId, remedyHash);

        trade.postHandoffRemedyHash = remedyHash;
        trade.postHandoffRemedyMaxAmount = remedy.maxAmount;
        trade.postHandoffReturnRequired = remedy.returnRequired;
        trade.postHandoffReturnCustodyHash = remedy.returnCustodyHash;
        trade.postHandoffEvidenceRoot = remedy.evidenceRoot;
        trade.postHandoffAppealFinalStateHash = remedy.appealFinalStateHash;
        trade.postHandoffNonReturnRemedyAllowed = remedy.nonReturnRemedyAllowed;

        emit PostHandoffRemedyCommitted(tradeId, remedyHash, remedy.maxAmount);
    }

    function resolveClaim(
        uint256 tradeId,
        bytes32 rulingHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer,
        bytes calldata rulingSignature
    ) external onlyArbiter(tradeId) inState(tradeId, State.ClaimOrDisputePending) {
        if (rulingHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, rulingHash, rulingSignature);
        if (buyerRefundBps > 10_000 || sellerBondPenaltyBps > 10_000) revert BadAmount();

        _resolveClaim(tradeId, rulingHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer, 0);
    }

    function resolveClaimWithVerifierRuling(
        uint256 tradeId,
        bytes32 rulingHash,
        bytes32 scopeHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer,
        bytes calldata verifierSignature
    ) external inState(tradeId, State.ClaimOrDisputePending) {
        Trade storage trade = trades[tradeId];
        if (rulingHash == bytes32(0)) revert BadHash();
        if (scopeHash != trade.acceptedVerifierScopeHash) {
            revert JscScopeMismatch(trade.acceptedVerifierScopeHash, scopeHash);
        }
        if (buyerRefundBps > 10_000 || sellerBondPenaltyBps > 10_000) revert BadAmount();
        if (!_verifierSettlementAuthorized(trade)) revert VerifierSettlementNotAuthorized();
        if (!actorRegistry.isVerifierActive(trade.acceptedVerifier)) {
            revert UnregisteredActor(trade.acceptedVerifier);
        }
        if (trade.verifierBondLocked < trade.verifierBondRequired) {
            revert VerifierBondRequired(trade.verifierBondRequired, trade.verifierBondLocked);
        }

        _requireSignature(
            trade.acceptedVerifier,
            verifierSettlementRulingHash(
                tradeId, rulingHash, scopeHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer
            ),
            verifierSignature
        );

        _resolveClaim(tradeId, rulingHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer, 3);
    }

    function resolveClaimViaFloor(
        uint256 tradeId,
        bytes32 rulingHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer,
        bytes calldata floorSignature,
        address[] calldata panelSigners,
        bytes[] calldata panelSignatures
    ) external inState(tradeId, State.ClaimOrDisputePending) {
        Trade storage trade = trades[tradeId];
        if (rulingHash == bytes32(0)) revert BadHash();
        if (buyerRefundBps > 10_000 || sellerBondPenaltyBps > 10_000) revert BadAmount();
        uint256 availableAt = trade.claimOpenedAt + ARBITER_REPLACEMENT_TIMEOUT;
        if (block.timestamp <= availableAt) revert ReplacementTimeoutOpen(availableAt);
        _requireFloorJudgmentRoute(trade);
        _requireFloorAppealWindowClosed(trade, availableAt);

        bytes32 payloadHash =
            floorRulingHash(tradeId, rulingHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer);

        _requireSignature(trade.floorExecutor, payloadHash, floorSignature);
        _requireFloorPanelQuorum(tradeId, trade, payloadHash, panelSigners, panelSignatures);

        _resolveClaim(tradeId, rulingHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer, 1);
    }

    function resolveUnresolvableClaimByDefault(uint256 tradeId, bytes32 rulingHash)
        external
        inState(tradeId, State.ClaimOrDisputePending)
    {
        Trade storage trade = trades[tradeId];
        if (rulingHash == bytes32(0)) revert BadHash();
        uint256 availableAt = trade.claimOpenedAt + ARBITER_REPLACEMENT_TIMEOUT + FLOOR_RESOLUTION_TIMEOUT;
        if (block.timestamp <= availableAt) revert FloorResolutionTimeoutOpen(availableAt);
        if (trade.postDeliveryClaim) revert PostDeliveryDefaultRequiresFloorReceipt();

        _resolveClaim(tradeId, rulingHash, 10_000, 0, true, 2);
    }

    function resolvePostDeliveryUnresolvableClaimByFloorReceipt(
        uint256 tradeId,
        bytes32 rulingHash,
        bytes32 receiptHash,
        bytes calldata floorSignature,
        address[] calldata panelSigners,
        bytes[] calldata panelSignatures
    ) external inState(tradeId, State.ClaimOrDisputePending) {
        Trade storage trade = trades[tradeId];
        if (rulingHash == bytes32(0) || receiptHash == bytes32(0)) revert BadHash();
        uint256 availableAt = trade.claimOpenedAt + ARBITER_REPLACEMENT_TIMEOUT + FLOOR_RESOLUTION_TIMEOUT;
        if (block.timestamp <= availableAt) revert FloorResolutionTimeoutOpen(availableAt);
        if (!trade.postDeliveryClaim) revert PostDeliveryClaimRequired();
        _requireFloorJudgmentRoute(trade);
        _requireFloorAppealWindowClosed(trade, availableAt);

        bytes32 payloadHash = unresolvableClaimReceiptHash(tradeId, rulingHash, receiptHash);

        _requireSignature(trade.floorExecutor, payloadHash, floorSignature);
        _requireFloorPanelQuorum(tradeId, trade, payloadHash, panelSigners, panelSignatures);
        _anchorPacketHash(tradeId, receiptHash);

        _resolveClaim(tradeId, rulingHash, 10_000, 0, true, 2);
    }

    function approveArbiterReplacement(
        uint256 tradeId,
        address newArbiter,
        bytes32 proposalHash,
        bytes calldata proposalSignature
    ) external {
        Trade storage trade = trades[tradeId];
        _onlyBuyerOrSeller(trade);
        _onlyOpen(trade);

        if (newArbiter == address(0) || newArbiter == trade.arbiter) revert BadAddress();
        if (proposalHash == bytes32(0)) revert BadHash();
        if (!actorRegistry.isArbiterActive(newArbiter)) revert UnregisteredArbiter(newArbiter);
        _requireSignature(msg.sender, proposalHash, proposalSignature);

        ArbiterReplacement storage approval = arbiterReplacementApprovals[tradeId][proposalHash];
        if (approval.proposedArbiter == address(0)) {
            approval.proposedArbiter = newArbiter;
            approval.proposalHash = proposalHash;
            approval.proposedAt = uint64(block.timestamp);
            approval.buyerApproved = false;
            approval.sellerApproved = false;
        } else if (approval.proposedArbiter != newArbiter) {
            revert BadAddress();
        }

        if (msg.sender == trade.buyer) {
            approval.buyerApproved = true;
        } else {
            approval.sellerApproved = true;
        }

        emit ArbiterReplacementApproved(tradeId, msg.sender, newArbiter, proposalHash);

        if (approval.buyerApproved && approval.sellerApproved) {
            address oldArbiter = trade.arbiter;
            trade.arbiter = newArbiter;
            delete arbiterReplacementApprovals[tradeId][proposalHash];
            emit ArbiterReplaced(tradeId, oldArbiter, newArbiter, proposalHash);
        }
    }

    function emergencyReplaceArbiter(uint256 tradeId, bytes32 proposalHash, bytes calldata arbiterAcceptanceSignature)
        external
        inState(tradeId, State.ClaimOrDisputePending)
    {
        Trade storage trade = trades[tradeId];
        ArbiterReplacement storage approval = arbiterReplacementApprovals[tradeId][proposalHash];
        if (approval.proposedArbiter == address(0)) {
            revert ReplacementProposalMissing(proposalHash);
        }
        if (actorRegistry.isArbiterActive(trade.arbiter)) {
            revert ArbiterStillActive(trade.arbiter);
        }
        if (block.timestamp < uint256(approval.proposedAt) + ARBITER_REPLACEMENT_TIMEOUT) {
            revert ReplacementTimeoutOpen(uint256(approval.proposedAt) + ARBITER_REPLACEMENT_TIMEOUT);
        }
        if (!actorRegistry.isArbiterActive(approval.proposedArbiter)) {
            revert UnregisteredArbiter(approval.proposedArbiter);
        }
        _requireSignature(approval.proposedArbiter, approval.proposalHash, arbiterAcceptanceSignature);

        address oldArbiter = trade.arbiter;
        address newArbiter = approval.proposedArbiter;
        trade.arbiter = newArbiter;
        delete arbiterReplacementApprovals[tradeId][proposalHash];

        emit EmergencyArbiterReplaced(tradeId, oldArbiter, newArbiter, proposalHash);
    }

    function getState(uint256 tradeId) external view returns (State) {
        return trades[tradeId].state;
    }

    function getRoute(uint256 tradeId)
        external
        view
        returns (
            bytes32 routeHash,
            bytes32 wallBundleHash,
            bool inPersonAllowed,
            bool insured,
            uint256 declaredInsurance
        )
    {
        Trade storage trade = trades[tradeId];
        return
            (trade.routeHash, trade.routeWallBundleHash, trade.inPersonAllowed, trade.insured, trade.declaredInsurance);
    }

    function getRouteAssembly(uint256 tradeId)
        external
        view
        returns (bytes32 routeSpendabilityHash_, bytes32 assemblyHistoryHash, bytes32 routeAssemblyWitnessHash_)
    {
        Trade storage trade = trades[tradeId];
        return (trade.routeSpendabilityHash, trade.routeAssemblyHistoryHash, trade.routeAssemblyWitnessHash);
    }

    function alphaAdmissionPolicyHash(uint256 tradeId, AlphaAdmissionPolicy calldata policy)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                ALPHA_ADMISSION_POLICY_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                policy.policyHash,
                policy.policyAuthority,
                policy.version,
                policy.effectiveBlock,
                policy.routeClass,
                policy.maxTradeValue,
                policy.principalExposureAfter,
                policy.maxPrincipalExposure,
                policy.controlClusterId,
                policy.controlClusterExposureAfter,
                policy.maxControlClusterExposure,
                policy.custodianId,
                policy.custodianExposureAfter,
                policy.maxCustodianExposure,
                policy.verifier,
                policy.verifierExposureAfter,
                policy.maxVerifierExposure,
                policy.judgmentAuthority,
                policy.judgmentAuthorityExposureAfter,
                policy.maxJudgmentAuthorityExposure,
                policy.registryVersionHash,
                policy.registryVersionExposureAfter,
                policy.maxRegistryVersionExposure,
                policy.epochId,
                policy.globalEpochLossAfter,
                policy.maxGlobalEpochLoss,
                policy.deliveryMode,
                policy.disputeBranch,
                policy.manualOverride,
                policy.manualAuthority,
                policy.manualSecondApprover,
                policy.manualReasonHash,
                policy.manualOverrideLoss,
                policy.manualRemainingLossBudget
            )
        );
    }

    function routeAssemblyWitnessHash(
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 spendabilityHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash
    ) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                ROUTE_ASSEMBLY_WITNESS_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                routeHash,
                spendabilityHash,
                wallBundleHash,
                assemblyHistoryHash,
                trade.itemFingerprintHash,
                trade.inventoryLockHash,
                ROUTE_COMMITMENT_GATE
            )
        );
    }

    function routeSpendabilityHash(
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash,
        address issuer
    ) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        bytes32 boundArtifactsHash = keccak256(
            abi.encode(
                routeHash, wallBundleHash, assemblyHistoryHash, trade.itemFingerprintHash, trade.inventoryLockHash
            )
        );
        return _spendabilityDigest(tradeId, ROUTE_COMMITMENT_GATE, ROUTE_COMMITMENT_LEG, boundArtifactsHash, issuer);
    }

    function routeSpendabilityHash(
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash,
        TypedSpendability calldata typedSpendability
    ) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        bytes32 boundArtifactsHash = keccak256(
            abi.encode(
                routeHash, wallBundleHash, assemblyHistoryHash, trade.itemFingerprintHash, trade.inventoryLockHash
            )
        );
        return _typedSpendabilityDigest(
            tradeId, ROUTE_COMMITMENT_GATE, ROUTE_COMMITMENT_LEG, boundArtifactsHash, typedSpendability
        );
    }

    function inventoryLockBindingHash(uint256 tradeId, bytes32 inventoryLockHash, bytes32 itemFingerprintHash)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                INVENTORY_LOCK_BINDING_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                inventoryLockHash,
                itemFingerprintHash
            )
        );
    }

    function deliveryWitnessHash(uint256 tradeId, bytes32 deliveryHash, bytes32 spendabilityHash)
        public
        view
        returns (bytes32)
    {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                DELIVERY_WITNESS_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                trade.routeHash,
                deliveryHash,
                spendabilityHash,
                DELIVERY_CONFIRMATION_GATE
            )
        );
    }

    function deliverySpendabilityHash(uint256 tradeId, bytes32 deliveryHash, address issuer)
        public
        view
        returns (bytes32)
    {
        Trade storage trade = trades[tradeId];
        bytes32 boundArtifactsHash =
            keccak256(abi.encode(trade.routeHash, deliveryHash, trade.routeAssemblyWitnessHash));
        return
            _spendabilityDigest(
                tradeId, DELIVERY_CONFIRMATION_GATE, DELIVERY_CONFIRMATION_LEG, boundArtifactsHash, issuer
            );
    }

    function deliverySpendabilityHash(
        uint256 tradeId,
        bytes32 deliveryHash,
        TypedSpendability calldata typedSpendability
    ) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        bytes32 boundArtifactsHash =
            keccak256(abi.encode(trade.routeHash, deliveryHash, trade.routeAssemblyWitnessHash));
        return _typedSpendabilityDigest(
            tradeId, DELIVERY_CONFIRMATION_GATE, DELIVERY_CONFIRMATION_LEG, boundArtifactsHash, typedSpendability
        );
    }

    function deliveryTriggerPolicyHash(uint256 tradeId, DeliveryTriggerPolicy calldata policy)
        public
        view
        returns (bytes32)
    {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                DELIVERY_TRIGGER_POLICY_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                trade.routeHash,
                policy.policyHash,
                policy.witnessClassHash,
                policy.witnessIssuer,
                policy.issuerConflictRef,
                policy.scopeHash,
                policy.expiryBlock,
                policy.challengeDeadlineBlock,
                policy.settlementCeiling,
                policy.sellerAssociated,
                policy.independentWitnessCount,
                policy.missingWitnessCanEstablishNonDelivery
            )
        );
    }

    function postHandoffRemedyHash(uint256 tradeId, PostHandoffRemedy calldata remedy)
        public
        view
        returns (bytes32)
    {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                POST_HANDOFF_REMEDY_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                trade.claimHash,
                remedy.claimTypeHash,
                remedy.remedyTypeHash,
                remedy.maxAmount,
                remedy.returnRequired,
                remedy.returnCustodyHash,
                remedy.evidenceRoot,
                remedy.appealFinalStateHash,
                remedy.nonReturnRemedyAllowed
            )
        );
    }

    function verifierScopeApprovalHash(uint256 tradeId, address verifier, bytes32 scopeSetHash, bytes32 approvalHash)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                VERIFIER_SCOPE_APPROVAL_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                verifier,
                scopeSetHash,
                approvalHash
            )
        );
    }

    function verifierAttestationBindingHash(
        uint256 tradeId,
        bytes32 attestationHash,
        bytes32 subjectHash,
        bytes32 scopeSetHash,
        bytes32 methodIdHash
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                VERIFIER_ATTESTATION_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                attestationHash,
                subjectHash,
                scopeSetHash,
                methodIdHash
            )
        );
    }

    function jscVerifierRouteHash(uint256 tradeId, JscVerifierRoute calldata route) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                JSC_VERIFIER_ROUTE_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                trade.jscHash,
                route.routeClass,
                route.authorityLevel,
                route.acceptedVerifier,
                route.scopeHash,
                route.evidenceFloorHash,
                route.feeScheduleHash,
                route.feePayer,
                route.feeOutcomeIndependent,
                route.buyerDisputeBondRequired,
                route.verifierBondRequired,
                route.verifierExposureCap,
                route.verifierBondTailSeconds,
                route.appealHash,
                route.witnessCanSettle
            )
        );
    }

    function jscVerifierRouteAcceptanceHash(uint256 tradeId, bytes32 routeHash) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                JSC_VERIFIER_ROUTE_ACCEPTANCE_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                trade.jscHash,
                routeHash,
                trade.seller
            )
        );
    }

    function verifierSettlementRulingHash(
        uint256 tradeId,
        bytes32 rulingHash,
        bytes32 scopeHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer
    ) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                VERIFIER_SETTLEMENT_RULING_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                rulingHash,
                trade.claimHash,
                trade.jscHash,
                trade.jscVerifierRouteHash,
                trade.acceptedVerifier,
                scopeHash,
                buyerRefundBps,
                sellerBondPenaltyBps,
                returnDisputeBondToBuyer
            )
        );
    }

    function fingerprintChallengeResolutionHash(
        uint256 tradeId,
        bytes32 resolutionHash,
        bytes32 challengeHash,
        bytes32 attestationHash
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                FINGERPRINT_CHALLENGE_RESOLUTION_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                resolutionHash,
                challengeHash,
                attestationHash
            )
        );
    }

    function floorJudgmentRouteHash(uint256 tradeId, FloorJudgmentRoute calldata route) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                FLOOR_JUDGMENT_ROUTE_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                trade.jscHash,
                trade.floorExecutor,
                _floorPanelMembersHash(route.panelMembers),
                route.requiredSignatures,
                route.appealWindowSeconds,
                route.appealAuthorityHash,
                route.panelMetadataHash
            )
        );
    }

    function floorRulingHash(
        uint256 tradeId,
        bytes32 rulingHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer
    ) public view returns (bytes32) {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                FLOOR_RULING_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                rulingHash,
                trade.jscHash,
                trade.floorExecutor,
                buyerRefundBps,
                sellerBondPenaltyBps,
                returnDisputeBondToBuyer
            )
        );
    }

    function unresolvableClaimReceiptHash(uint256 tradeId, bytes32 rulingHash, bytes32 receiptHash)
        public
        view
        returns (bytes32)
    {
        Trade storage trade = trades[tradeId];
        return keccak256(
            abi.encode(
                UNRESOLVABLE_CLAIM_RECEIPT_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                rulingHash,
                receiptHash,
                trade.jscHash,
                trade.floorExecutor
            )
        );
    }

    function _onlyParticipant(Trade storage trade) internal view {
        if (msg.sender != trade.buyer && msg.sender != trade.seller && msg.sender != trade.arbiter) {
            revert Unauthorized();
        }
    }

    function _onlyBuyerOrSeller(Trade storage trade) internal view {
        if (msg.sender != trade.buyer && msg.sender != trade.seller) {
            revert Unauthorized();
        }
    }

    function _onlyOpen(Trade storage trade) internal view {
        if (trade.state == State.None || trade.state == State.Settled || trade.state == State.Cancelled) {
            revert ClosedTrade();
        }
    }

    function _acceptAndBond(uint256 tradeId, Trade storage trade) internal {
        if (msg.value != trade.sellerBondRequired) revert WrongBondAmount();

        trade.sellerBondLocked = msg.value;
        trade.state = State.EvidencePending;

        emit SellerBonded(tradeId, msg.value);
    }

    function _validateAlphaAdmissionPolicy(
        uint256 tradeId,
        uint256 tradeValue,
        AlphaAdmissionPolicy calldata policy,
        address buyer,
        address seller,
        address arbiter,
        address floorExecutor,
        bytes calldata policySignature
    ) internal view {
        bytes32 policySnapshotHash = alphaAdmissionPolicyHash(tradeId, policy);
        if (policy.policyHash == bytes32(0) || policySnapshotHash == bytes32(0)) {
            revert AlphaAdmissionPolicyRequired();
        }
        if (
            policy.policyAuthority == address(0) || policy.policyAuthority == buyer || policy.policyAuthority == seller
                || (!actorRegistry.isArbiterActive(policy.policyAuthority)
                    && !actorRegistry.isVerifierActive(policy.policyAuthority))
        ) {
            revert AlphaAdmissionPolicyRejected(policy.policyHash);
        }
        _requireSignature(policy.policyAuthority, policySnapshotHash, policySignature);
        if (
            policy.version != ALPHA_POLICY_VERSION || block.number < policy.effectiveBlock
                || policy.routeClass == bytes32(0) || policy.deliveryMode == bytes32(0)
                || policy.disputeBranch == bytes32(0) || policy.registryVersionHash == bytes32(0)
                || policy.epochId == 0
        ) {
            revert AlphaAdmissionPolicyRejected(policy.policyHash);
        }
        if (
            tradeValue > policy.maxTradeValue
                || policy.principalExposureAfter != alphaPrincipalExposure[buyer] + tradeValue
                || policy.principalExposureAfter > policy.maxPrincipalExposure
                || policy.controlClusterId == bytes32(0)
                || policy.controlClusterExposureAfter != alphaControlClusterExposure[policy.controlClusterId] + tradeValue
                || policy.controlClusterExposureAfter > policy.maxControlClusterExposure
                || policy.custodianId == bytes32(0)
                || policy.custodianExposureAfter != alphaCustodianExposure[policy.custodianId] + tradeValue
                || policy.custodianExposureAfter > policy.maxCustodianExposure
                || policy.verifierExposureAfter > policy.maxVerifierExposure
                || policy.judgmentAuthorityExposureAfter
                    != alphaJudgmentAuthorityExposure[policy.judgmentAuthority] + tradeValue
                || policy.judgmentAuthorityExposureAfter > policy.maxJudgmentAuthorityExposure
                || policy.registryVersionExposureAfter != alphaRegistryVersionExposure[policy.registryVersionHash] + tradeValue
                || policy.registryVersionExposureAfter > policy.maxRegistryVersionExposure
                || policy.globalEpochLossAfter != alphaEpochExposure[policy.epochId] + tradeValue
                || policy.globalEpochLossAfter > policy.maxGlobalEpochLoss
        ) {
            revert AlphaAdmissionPolicyRejected(policy.policyHash);
        }
        if (policy.verifier == address(0)) {
            if (policy.verifierExposureAfter != 0) revert AlphaAdmissionPolicyRejected(policy.policyHash);
        } else if (
            !actorRegistry.isVerifierActive(policy.verifier)
                || policy.verifierExposureAfter != alphaVerifierExposure[policy.verifier]
        ) {
            revert AlphaAdmissionPolicyRejected(policy.policyHash);
        }
        if (
            policy.judgmentAuthority == address(0)
                || (policy.judgmentAuthority != arbiter && policy.judgmentAuthority != floorExecutor)
        ) {
            revert AlphaAdmissionPolicyRejected(policy.policyHash);
        }
        if (policy.manualOverride) {
            if (
                policy.manualAuthority == address(0) || policy.manualSecondApprover == address(0)
                    || policy.manualAuthority == policy.manualSecondApprover || policy.manualReasonHash == bytes32(0)
                    || policy.manualOverrideLoss > policy.manualRemainingLossBudget
            ) {
                revert AlphaAdmissionPolicyRejected(policy.policyHash);
            }
        }
    }

    function _reserveAlphaAdmissionExposure(uint256 tradeId, Trade storage trade) internal {
        alphaPrincipalExposure[trade.buyer] += trade.alphaPrincipalExposureReserved;
        alphaControlClusterExposure[trade.alphaControlClusterId] += trade.alphaControlClusterExposureReserved;
        alphaCustodianExposure[trade.alphaCustodianId] += trade.alphaCustodianExposureReserved;
        alphaJudgmentAuthorityExposure[trade.alphaJudgmentAuthority] += trade.alphaJudgmentAuthorityExposureReserved;
        alphaRegistryVersionExposure[trade.alphaRegistryVersionHash] += trade.alphaRegistryVersionExposureReserved;
        alphaEpochExposure[trade.alphaEpochId] += trade.alphaEpochExposureReserved;

        emit AlphaExposureReserved(tradeId, trade.alphaPolicyHash, trade.alphaPrincipalExposureReserved);
    }

    function _reserveAlphaVerifierExposure(Trade storage trade, address verifier, uint256 amount) internal {
        if (amount == 0) return;
        if (trade.alphaMaxVerifierExposure == 0) revert AlphaAdmissionPolicyRejected(trade.alphaPolicyHash);
        if (trade.alphaVerifier != address(0) && trade.alphaVerifier != verifier) {
            revert AlphaAdmissionPolicyRejected(trade.alphaPolicyHash);
        }
        uint256 verifierExposureAfter = alphaVerifierExposure[verifier] + amount;
        if (verifierExposureAfter > trade.alphaMaxVerifierExposure) {
            revert AlphaAdmissionPolicyRejected(trade.alphaPolicyHash);
        }

        trade.alphaVerifier = verifier;
        trade.alphaVerifierExposureReserved += amount;
        alphaVerifierExposure[verifier] = verifierExposureAfter;
    }

    function _validateJscVerifierRoute(uint256 tradeId, Trade storage trade, JscVerifierRoute calldata route)
        internal
        view
    {
        if (route.routeClass == VerifierRouteClass.None || route.authorityLevel == VerifierAuthorityLevel.None) {
            revert JudgmentSupplyRequired();
        }
        if (!actorRegistry.isVerifierActive(route.acceptedVerifier)) {
            revert UnregisteredActor(route.acceptedVerifier);
        }
        if (
            route.acceptedVerifier == trade.buyer || route.acceptedVerifier == trade.seller
                || route.acceptedVerifier == trade.arbiter || route.acceptedVerifier == trade.floorExecutor
                || floorPanelMembers[tradeId][route.acceptedVerifier]
        ) {
            revert BadAddress();
        }
        if (route.scopeHash == bytes32(0) || route.evidenceFloorHash == bytes32(0)) {
            revert BadHash();
        }

        if (route.authorityLevel == VerifierAuthorityLevel.PrivateAdvisor) {
            if (
                route.buyerDisputeBondRequired != 0 || route.verifierBondRequired != 0 || route.verifierExposureCap != 0
                    || route.witnessCanSettle
            ) {
                revert BadAmount();
            }
            return;
        }

        if (route.feeScheduleHash == bytes32(0) || route.appealHash == bytes32(0)) {
            revert BadHash();
        }
        if (route.feePayer != FeePayer.Buyer && route.feePayer != FeePayer.Escrow) {
            revert BadAmount();
        }
        if (!route.feeOutcomeIndependent) revert BadAmount();
        if (route.buyerDisputeBondRequired != trade.disputeBondRequired) {
            revert WrongBondAmount();
        }
        if (route.verifierBondRequired == 0 || route.verifierExposureCap == 0) {
            revert BadAmount();
        }
        if (trade.alphaPolicySnapshotHash == bytes32(0)) revert AlphaAdmissionPolicyRequired();
        if (trade.alphaDisputeBranch == bytes32(0)) revert AlphaAdmissionPolicyRequired();
    }

    function _validateDeliveryTriggerPolicy(
        Trade storage trade,
        DeliveryTriggerPolicy calldata policy,
        address witness
    ) internal view {
        if (policy.policyHash == bytes32(0)) revert DeliveryPolicyRequired();
        if (
            policy.witnessClassHash == bytes32(0) || policy.witnessIssuer != witness
                || policy.issuerConflictRef == bytes32(0) || policy.scopeHash != trade.routeHash
                || block.number > policy.expiryBlock || policy.challengeDeadlineBlock < block.number
                || policy.challengeDeadlineBlock > policy.expiryBlock || policy.settlementCeiling < trade.escrowAmount
                || policy.missingWitnessCanEstablishNonDelivery
        ) {
            revert DeliveryPolicyRejected(policy.policyHash);
        }
        if (policy.sellerAssociated && policy.independentWitnessCount == 0) {
            revert DeliveryPolicyRejected(policy.policyHash);
        }
    }

    function _validatePostHandoffRemedy(PostHandoffRemedy calldata remedy, bytes32 remedyHash) internal pure {
        if (remedyHash == bytes32(0)) revert PostHandoffRemedyRequired();
        if (
            remedy.claimTypeHash == bytes32(0) || remedy.remedyTypeHash == bytes32(0) || remedy.maxAmount == 0
                || remedy.evidenceRoot == bytes32(0) || remedy.appealFinalStateHash != APPEAL_FINAL_STATE_HASH
        ) {
            revert PostHandoffRemedyRejected(remedyHash);
        }
        if (remedy.returnRequired && remedy.returnCustodyHash == bytes32(0)) {
            revert PostHandoffRemedyRejected(remedyHash);
        }
        if (!remedy.returnRequired && !remedy.nonReturnRemedyAllowed) {
            revert PostHandoffRemedyRejected(remedyHash);
        }
    }

    function _requirePostHandoffRemedy(Trade storage trade, uint256 buyerRefund) internal view {
        bytes32 remedyHash = trade.postHandoffRemedyHash;
        if (remedyHash == bytes32(0)) revert PostHandoffRemedyRequired();
        if (
            buyerRefund > trade.postHandoffRemedyMaxAmount
                || trade.postHandoffEvidenceRoot == bytes32(0)
                || trade.postHandoffAppealFinalStateHash != APPEAL_FINAL_STATE_HASH
        ) {
            revert PostHandoffRemedyRejected(remedyHash);
        }
        if (trade.postHandoffReturnRequired && trade.postHandoffReturnCustodyHash == bytes32(0)) {
            revert PostHandoffRemedyRejected(remedyHash);
        }
        if (
            buyerRefund == trade.escrowAmount && trade.postHandoffReturnCustodyHash == bytes32(0)
                && !trade.postHandoffNonReturnRemedyAllowed
        ) {
            revert PostHandoffRemedyRejected(remedyHash);
        }
    }

    function _validateTypedSpendability(
        Trade storage trade,
        TypedSpendability calldata spendability,
        address issuer,
        uint8 requiredAuthority,
        bytes32 spendabilityHash
    ) internal view {
        if (spendabilityHash == bytes32(0)) revert TypedSpendabilityRequired();
        if (
            spendability.issuer != issuer || spendability.canonicalPreimageHash == bytes32(0)
                || spendability.constituentClaimsHash == bytes32(0)
                || spendability.sourceClaimsAvailabilityHash == bytes32(0)
                || spendability.validatorCodeHash == bytes32(0) || spendability.validatorPolicyHash == bytes32(0)
                || spendability.issuerRoleHash == bytes32(0)
                || spendability.issuerAuthorityCeiling < requiredAuthority
                || spendability.issuerConflictRef == bytes32(0)
                || spendability.registrySnapshotHash != trade.alphaPolicySnapshotHash
                || block.number > spendability.expiryBlock || spendability.dataAvailabilityHash == bytes32(0)
                || spendability.preimageAvailabilityHash == bytes32(0) || spendability.notClaimingHash == bytes32(0)
        ) {
            revert TypedSpendabilityRejected(spendabilityHash);
        }
        if (
            spendability.sourceBasisHash == MODEL_OUTPUT_SOURCE_BASIS_HASH
                || spendability.sourceBasisHash == REPUTATION_SCORE_SOURCE_BASIS_HASH
                || spendability.sourceBasisHash == SUMMARY_SOURCE_BASIS_HASH
        ) {
            revert TypedSpendabilityRejected(spendabilityHash);
        }
        if (
            spendability.sourceClaimAuthor == issuer && (!spendability.downgraded || !spendability.valueCapped)
        ) {
            revert TypedSpendabilityRejected(spendabilityHash);
        }
    }

    function _validateFloorJudgmentRoute(Trade storage trade, FloorJudgmentRoute calldata route) internal view {
        uint256 memberCount = route.panelMembers.length;
        if (
            memberCount == 0 || memberCount > MAX_FLOOR_PANEL_MEMBERS || route.requiredSignatures == 0
                || route.requiredSignatures > memberCount
        ) {
            revert BadAmount();
        }
        if (route.requiredSignatures < 2) revert FloorPanelQuorumRequired(2, route.requiredSignatures);
        if (route.appealWindowSeconds == 0 || route.appealAuthorityHash == bytes32(0)) {
            revert BadHash();
        }
        if (route.panelMetadataHash == bytes32(0)) revert BadHash();

        bool floorExecutorIncluded = false;
        for (uint256 i = 0; i < memberCount; ++i) {
            address member = route.panelMembers[i];
            _requireFloorAuthorityUnconflicted(trade, member);
            if (!actorRegistry.isArbiterActive(member)) revert UnregisteredArbiter(member);
            if (member == trade.floorExecutor) {
                floorExecutorIncluded = true;
            }
            for (uint256 j = 0; j < i; ++j) {
                if (route.panelMembers[j] == member) revert DuplicatePanelSigner(member);
            }
        }

        if (!floorExecutorIncluded) revert FloorPanelMemberRequired(trade.floorExecutor);
    }

    function _requireFloorAuthorityUnconflicted(Trade storage trade, address authority) internal view {
        if (authority == address(0)) revert BadAddress();
        if (
            authority == trade.buyer || authority == trade.seller || authority == trade.arbiter
                || authority == trade.acceptedVerifier
        ) {
            revert JudgmentAuthorityConflict(authority);
        }
    }

    function _requireFloorJudgmentRoute(Trade storage trade) internal view {
        if (trade.floorJudgmentRouteHash == bytes32(0)) revert FloorJudgmentRouteRequired();
    }

    function _requireFloorAppealWindowClosed(Trade storage trade, uint256 baseAvailableAt) internal view {
        uint256 appealAvailableAt = baseAvailableAt + trade.floorAppealWindowSeconds;
        if (block.timestamp <= appealAvailableAt) revert FloorAppealWindowOpen(appealAvailableAt);
    }

    function _requireFloorPanelQuorum(
        uint256 tradeId,
        Trade storage trade,
        bytes32 payloadHash,
        address[] calldata panelSigners,
        bytes[] calldata panelSignatures
    ) internal view {
        if (panelSigners.length != panelSignatures.length) revert BadAmount();
        if (!floorPanelMembers[tradeId][trade.floorExecutor]) {
            revert FloorPanelMemberRequired(trade.floorExecutor);
        }
        if (!actorRegistry.isArbiterActive(trade.floorExecutor)) {
            revert UnregisteredArbiter(trade.floorExecutor);
        }

        uint256 validSignatures = 1;
        for (uint256 i = 0; i < panelSigners.length; ++i) {
            address signer = panelSigners[i];
            if (signer == trade.floorExecutor) revert DuplicatePanelSigner(signer);
            if (!floorPanelMembers[tradeId][signer]) revert FloorPanelMemberRequired(signer);
            if (!actorRegistry.isArbiterActive(signer)) revert UnregisteredArbiter(signer);
            for (uint256 j = 0; j < i; ++j) {
                if (panelSigners[j] == signer) revert DuplicatePanelSigner(signer);
            }
            _requireSignature(signer, payloadHash, panelSignatures[i]);
            ++validSignatures;
        }

        if (validSignatures < trade.floorRequiredSignatures) {
            revert FloorPanelQuorumRequired(trade.floorRequiredSignatures, validSignatures);
        }
    }

    function _floorPanelMembersHash(address[] calldata panelMembers) internal pure returns (bytes32) {
        return keccak256(abi.encode(panelMembers));
    }

    function _verifierSettlementAuthorized(Trade storage trade) internal view returns (bool) {
        if (trade.jscVerifierRouteHash == bytes32(0)) revert JscVerifierRouteRequired();
        if (trade.verifierAuthorityLevel == VerifierAuthorityLevel.SettlementVerifier) {
            return true;
        }
        return trade.verifierAuthorityLevel == VerifierAuthorityLevel.DisputeWitness && trade.verifierWitnessCanSettle;
    }

    function _spendabilityDigest(
        uint256 tradeId,
        bytes32 gateHash,
        bytes32 legHash,
        bytes32 boundArtifactsHash,
        address issuer
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                SPENDABILITY_DIGEST_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                gateHash,
                legHash,
                boundArtifactsHash,
                issuer
            )
        );
    }

    function _typedSpendabilityDigest(
        uint256 tradeId,
        bytes32 gateHash,
        bytes32 legHash,
        bytes32 boundArtifactsHash,
        TypedSpendability calldata spendability
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                TYPED_SPENDABILITY_DIGEST_TYPEHASH,
                address(this),
                block.chainid,
                tradeId,
                gateHash,
                legHash,
                boundArtifactsHash,
                spendability.issuer,
                spendability.canonicalPreimageHash,
                spendability.constituentClaimsHash,
                spendability.sourceClaimsAvailabilityHash,
                spendability.validatorCodeHash,
                spendability.validatorPolicyHash,
                spendability.issuerRoleHash,
                spendability.issuerAuthorityCeiling,
                spendability.issuerConflictRef,
                spendability.registrySnapshotHash,
                spendability.expiryBlock,
                spendability.dataAvailabilityHash,
                spendability.preimageAvailabilityHash,
                spendability.notClaimingHash,
                spendability.sourceBasisHash,
                spendability.sourceClaimAuthor,
                spendability.downgraded,
                spendability.valueCapped
            )
        );
    }

    function _anchorPacketHash(uint256 tradeId, bytes32 packetHash) internal {
        if (packetHash == bytes32(0)) revert BadHash();
        if (anchoredPacketHashes[tradeId][packetHash]) revert DuplicatePacket(packetHash);
        anchoredPacketHashes[tradeId][packetHash] = true;
    }

    function _consumeSpendability(uint256 tradeId, bytes32 spendabilityHash, bytes32 gateHash) internal {
        if (spendabilityHash == bytes32(0)) revert SpendabilityRequired();
        if (consumedSpendabilityHashes[tradeId][spendabilityHash]) {
            revert SpendabilityAlreadyConsumed(spendabilityHash);
        }

        consumedSpendabilityHashes[tradeId][spendabilityHash] = true;
        _anchorPacketHash(tradeId, spendabilityHash);

        emit SpendabilityConsumed(tradeId, spendabilityHash, gateHash);
    }

    function _resolveClaim(
        uint256 tradeId,
        bytes32 rulingHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer,
        uint8 resolutionMode
    ) internal {
        Trade storage trade = trades[tradeId];
        _anchorPacketHash(tradeId, rulingHash);
        uint256 buyerRefund = (trade.escrowAmount * buyerRefundBps) / 10_000;
        if (trade.postDeliveryClaim && buyerRefund != 0) {
            _requirePostHandoffRemedy(trade, buyerRefund);
        }
        uint256 sellerEscrowPayout = trade.escrowAmount - buyerRefund;
        uint256 sellerBondPenalty = (trade.sellerBondLocked * sellerBondPenaltyBps) / 10_000;
        uint256 sellerBondReturn = trade.sellerBondLocked - sellerBondPenalty;
        uint256 disputeBond = trade.disputeBondLocked;
        uint256 verifierBond = trade.verifierBondLocked;
        address verifierBondOwner = trade.verifierBondOwner;

        trade.state = State.Settled;
        if (verifierBond != 0) {
            trade.verifierBondReleaseAt = uint64(block.timestamp) + trade.verifierBondTailSeconds;
        }
        _releaseTradeObjectLocks(tradeId);

        if (resolutionMode == 1) {
            emit FloorClaimResolved(
                tradeId,
                trade.floorExecutor,
                rulingHash,
                buyerRefund,
                sellerEscrowPayout,
                sellerBondPenalty,
                returnDisputeBondToBuyer
            );
        } else if (resolutionMode == 2) {
            emit DefaultClaimResolved(
                tradeId, rulingHash, buyerRefund, sellerEscrowPayout, sellerBondPenalty, returnDisputeBondToBuyer
            );
        } else if (resolutionMode == 3) {
            emit VerifierClaimResolved(
                tradeId,
                trade.acceptedVerifier,
                rulingHash,
                buyerRefund,
                sellerEscrowPayout,
                sellerBondPenalty,
                returnDisputeBondToBuyer
            );
        } else {
            emit ClaimResolved(
                tradeId, rulingHash, buyerRefund, sellerEscrowPayout, sellerBondPenalty, returnDisputeBondToBuyer
            );
        }
        emit TradeSettled(tradeId);

        _send(payable(trade.buyer), buyerRefund + sellerBondPenalty);
        _send(payable(trade.seller), sellerEscrowPayout + sellerBondReturn);

        if (returnDisputeBondToBuyer) {
            _send(payable(trade.buyer), disputeBond);
        } else {
            _send(payable(trade.seller), disputeBond);
        }

        if (verifierBond != 0 && trade.verifierBondTailSeconds == 0) {
            trade.verifierBondLocked = 0;
            trade.verifierBondReleaseAt = 0;
            emit VerifierSettlementBondWithdrawn(tradeId, verifierBondOwner, verifierBond);
            _send(payable(verifierBondOwner), verifierBond);
        }
    }

    function _releaseTradeObjectLocks(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        _releaseAlphaExposure(tradeId, trade);

        bytes32 itemFingerprintHash = trade.itemFingerprintHash;
        if (itemFingerprintHash != bytes32(0) && activeItemFingerprints[itemFingerprintHash] == tradeId) {
            delete activeItemFingerprints[itemFingerprintHash];
            emit ItemFingerprintReleased(tradeId, itemFingerprintHash);
        }

        bytes32 inventoryLockHash = trade.inventoryLockHash;
        if (inventoryLockHash == bytes32(0)) return;
        if (activeInventoryLocks[inventoryLockHash] == tradeId) {
            delete activeInventoryLocks[inventoryLockHash];
            emit InventoryLockReleased(tradeId, inventoryLockHash);
        }
    }

    function _releaseAlphaExposure(uint256 tradeId, Trade storage trade) internal {
        uint256 principalExposure = trade.alphaPrincipalExposureReserved;
        if (principalExposure == 0) return;

        alphaPrincipalExposure[trade.buyer] -= principalExposure;
        alphaControlClusterExposure[trade.alphaControlClusterId] -= trade.alphaControlClusterExposureReserved;
        alphaCustodianExposure[trade.alphaCustodianId] -= trade.alphaCustodianExposureReserved;
        alphaJudgmentAuthorityExposure[trade.alphaJudgmentAuthority] -= trade.alphaJudgmentAuthorityExposureReserved;
        alphaRegistryVersionExposure[trade.alphaRegistryVersionHash] -= trade.alphaRegistryVersionExposureReserved;
        alphaEpochExposure[trade.alphaEpochId] -= trade.alphaEpochExposureReserved;

        uint256 verifierExposure = trade.alphaVerifierExposureReserved;
        if (verifierExposure != 0) {
            alphaVerifierExposure[trade.alphaVerifier] -= verifierExposure;
            trade.alphaVerifierExposureReserved = 0;
        }

        trade.alphaPrincipalExposureReserved = 0;
        trade.alphaControlClusterExposureReserved = 0;
        trade.alphaCustodianExposureReserved = 0;
        trade.alphaJudgmentAuthorityExposureReserved = 0;
        trade.alphaRegistryVersionExposureReserved = 0;
        trade.alphaEpochExposureReserved = 0;

        emit AlphaExposureReleased(tradeId, trade.alphaPolicyHash);
    }

    function _send(address payable to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _requireSignature(address signer, bytes32 payloadHash, bytes calldata signature) internal view {
        if (!actorRegistry.verifyActorSignature(signer, payloadHash, signature)) {
            revert BadSignature(signer, payloadHash);
        }
    }
}
