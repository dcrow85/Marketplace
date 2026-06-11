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
    function verifyPredicate(
        bytes32 predicateHash,
        bytes calldata publicInputs,
        bytes calldata proof
    ) external view returns (bool);
}

/// @notice Minimal local-EVM harness for the Marketplace protocol core.
/// @dev Rich cost-field objects live off-chain. This contract anchors money, bonds,
/// hashes, gates, and settlement events so the protocol can be pressure-tested.
contract MarketplaceEscrow {
    uint8 private constant ROLE_BUYER = 1;
    uint8 private constant ROLE_SELLER = 2;
    uint256 public constant ARBITER_REPLACEMENT_TIMEOUT = 1 days;
    uint256 public constant ROUTE_CLAIM_TIMEOUT = 3 days;

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
        State state;
        bytes32 intentHash;
        bytes32 termsHash;
        bytes32 itemFingerprintHash;
        bytes32 inventoryLockHash;
        bytes32 fingerprintChallengeHash;
        bytes32 routeHash;
        bytes32 routeWallBundleHash;
        bytes32 routeSpendabilityHash;
        bytes32 routeAssemblyHistoryHash;
        bytes32 routeAssemblyWitnessHash;
        bytes32 deliveryHash;
        bytes32 deliveryWitnessHash;
        bytes32 receiptHash;
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
    error InventoryLockFingerprintMismatch(
        bytes32 expectedItemFingerprintHash, bytes32 providedItemFingerprintHash
    );
    error InventoryLockMissing();
    error InventoryAlreadyLocked(bytes32 inventoryLockHash, uint256 tradeId);
    error FingerprintChallengeActive(bytes32 challengeHash);
    error FingerprintChallengeMissing();
    error UnapprovedVerifierScope(address verifier, bytes32 scopeSetHash);
    error AttestationSubjectMissing(bytes32 subjectHash);
    error ChallengeAttestationMissing(bytes32 attestationHash);
    error ChallengeAttestationSubjectMismatch(
        bytes32 expectedSubjectHash, bytes32 providedSubjectHash
    );
    error SpendabilityRequired();
    error SpendabilityAlreadyConsumed(bytes32 spendabilityHash);
    error SpendabilityDigestMismatch(
        bytes32 expectedSpendabilityHash, bytes32 providedSpendabilityHash
    );
    error WallBundleRequired();
    error AssemblyHistoryRequired();
    error RouteAssemblyWitnessRequired();
    error RouteWallBundleMismatch(bytes32 expectedWallBundleHash, bytes32 providedWallBundleHash);
    error RouteAssemblyWitnessMismatch(
        bytes32 expectedWitnessHash, bytes32 providedWitnessHash
    );
    error DeliveryWitnessRequired();
    error DeliveryWitnessMismatch(bytes32 expectedDeliveryWitnessHash, bytes32 providedDeliveryWitnessHash);

    uint256 public nextTradeId = 1;
    IMarketplaceActorRegistry public immutable actorRegistry;
    bytes32 public constant ROUTE_COMMITMENT_GATE =
        keccak256("marketplace.gate.route_commitment.v0.1");
    bytes32 public constant DELIVERY_CONFIRMATION_GATE =
        keccak256("marketplace.gate.delivery_confirmation.v0.1");
    bytes32 public constant ROUTE_COMMITMENT_LEG =
        keccak256("marketplace.leg.route_commitment.v0.1");
    bytes32 public constant DELIVERY_CONFIRMATION_LEG =
        keccak256("marketplace.leg.delivery_confirmation.v0.1");
    bytes32 public constant FINGERPRINT_SCOPE_SET_HASH =
        keccak256("marketplace.scope_set.item_fingerprint.v0.1");
    bytes32 public constant SPENDABILITY_DIGEST_TYPEHASH = keccak256(
        "SpendabilityDigest(address escrow,uint256 chainId,uint256 tradeId,bytes32 gateHash,bytes32 legHash,bytes32 boundArtifactsHash,address issuer)"
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
    bytes32 public constant ROUTE_ASSEMBLY_WITNESS_TYPEHASH = keccak256(
        "RouteAssemblyWitness(address escrow,uint256 chainId,uint256 tradeId,bytes32 routeHash,bytes32 routeSpendabilityHash,bytes32 wallBundleHash,bytes32 assemblyHistoryHash,bytes32 itemFingerprintHash,bytes32 inventoryLockHash,bytes32 gateHash)"
    );
    bytes32 public constant DELIVERY_WITNESS_TYPEHASH = keccak256(
        "DeliveryWitness(address escrow,uint256 chainId,uint256 tradeId,bytes32 routeHash,bytes32 deliveryHash,bytes32 spendabilityHash,bytes32 gateHash)"
    );

    mapping(uint256 tradeId => Trade) public trades;
    mapping(uint256 tradeId => mapping(bytes32 proposalHash => ArbiterReplacement)) public
        arbiterReplacementApprovals;
    mapping(uint256 tradeId => mapping(uint256 index => bytes32 hash)) public proofHashes;
    mapping(uint256 tradeId => mapping(uint256 index => bytes32 hash)) public evidenceHashes;
    mapping(uint256 tradeId => mapping(bytes32 packetHash => bool anchored)) public
        anchoredPacketHashes;
    mapping(uint256 tradeId => mapping(bytes32 spendabilityHash => bool consumed)) public
        consumedSpendabilityHashes;
    mapping(uint256 tradeId => mapping(address verifier => bool approved)) public
        approvedFingerprintVerifiers;
    mapping(
        uint256 tradeId
            => mapping(address verifier => mapping(bytes32 scopeSetHash => bool approved))
    ) public approvedVerifierScopes;
    mapping(uint256 tradeId => mapping(uint256 index => bytes32 hash)) public
        verifierAttestationHashes;
    mapping(
        uint256 tradeId => mapping(bytes32 attestationHash => VerifierAttestation attestation)
    ) public verifierAttestations;
    mapping(bytes32 itemFingerprintHash => uint256 tradeId) public activeItemFingerprints;
    mapping(bytes32 inventoryLockHash => uint256 tradeId) public activeInventoryLocks;

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address arbiter,
        uint256 escrowAmount,
        uint256 sellerBondRequired,
        uint256 disputeBondRequired,
        bytes32 intentHash,
        bytes32 termsHash
    );
    event TradeCancelled(uint256 indexed tradeId, bytes32 reasonHash);
    event SellerBonded(uint256 indexed tradeId, uint256 sellerBondLocked);
    event ProofAttached(
        uint256 indexed tradeId, address indexed issuer, uint256 index, bytes32 proofHash
    );
    event EvidenceAttached(
        uint256 indexed tradeId,
        address indexed issuer,
        EvidenceKind kind,
        uint256 index,
        bytes32 evidenceHash
    );
    event PredicateEvidenceAttached(
        uint256 indexed tradeId,
        address indexed issuer,
        address indexed predicateVerifier,
        EvidenceKind kind,
        uint256 index,
        bytes32 predicateHash
    );
    event ItemFingerprintCommitted(
        uint256 indexed tradeId, address indexed issuer, bytes32 itemFingerprintHash
    );
    event FingerprintVerifierApproved(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed verifier,
        bytes32 approvalHash
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
    event InventoryLocked(
        uint256 indexed tradeId, bytes32 inventoryLockHash, bytes32 boundItemFingerprintHash
    );
    event InventoryLockReleased(uint256 indexed tradeId, bytes32 inventoryLockHash);
    event FingerprintChallengeOpened(
        uint256 indexed tradeId, address indexed challenger, bytes32 challengeHash
    );
    event FingerprintChallengeCleared(
        uint256 indexed tradeId, address indexed issuer, bytes32 resolutionHash
    );
    event FingerprintChallengeClearedWithAttestation(
        uint256 indexed tradeId,
        address indexed issuer,
        bytes32 resolutionHash,
        bytes32 attestationHash
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
        uint256 indexed tradeId,
        bytes32 indexed wallBundleHash,
        bytes32 indexed spendabilityHash
    );
    event RouteAssemblyCommitted(
        uint256 indexed tradeId,
        bytes32 indexed routeSpendabilityHash,
        bytes32 indexed assemblyHistoryHash,
        bytes32 wallBundleHash,
        bytes32 routeAssemblyWitnessHash
    );
    event SpendabilityConsumed(
        uint256 indexed tradeId, bytes32 indexed spendabilityHash, bytes32 indexed gateHash
    );
    event RouteInProgress(uint256 indexed tradeId);
    event DeliveryWitnessCommitted(
        uint256 indexed tradeId,
        bytes32 indexed deliveryWitnessHash,
        bytes32 indexed spendabilityHash
    );
    event InspectionOpened(
        uint256 indexed tradeId,
        bytes32 deliveryHash,
        uint256 deliveredAt,
        uint256 inspectionDeadline
    );
    event RouteClaimOpened(uint256 indexed tradeId, bytes32 claimHash, uint256 disputeBondLocked);
    event BuyerAccepted(uint256 indexed tradeId, bytes32 receiptHash);
    event ClaimOpened(uint256 indexed tradeId, bytes32 claimHash, uint256 disputeBondLocked);
    event ClaimResolved(
        uint256 indexed tradeId,
        bytes32 rulingHash,
        uint256 buyerRefund,
        uint256 sellerEscrowPayout,
        uint256 sellerBondPenalty,
        bool disputeBondReturnedToBuyer
    );
    event ArbiterReplacementApproved(
        uint256 indexed tradeId,
        address indexed approver,
        address indexed proposedArbiter,
        bytes32 proposalHash
    );
    event ArbiterReplaced(
        uint256 indexed tradeId,
        address indexed oldArbiter,
        address indexed newArbiter,
        bytes32 proposalHash
    );
    event EmergencyArbiterReplaced(
        uint256 indexed tradeId,
        address indexed oldArbiter,
        address indexed newArbiter,
        bytes32 proposalHash
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
        address seller,
        address arbiter,
        uint256 sellerBondRequired,
        uint256 disputeBondRequired,
        uint256 inspectionSeconds,
        bytes32 intentHash,
        bytes32 termsHash,
        bytes calldata intentSignature,
        bytes calldata termsSignature
    ) external payable returns (uint256 tradeId) {
        if (seller == address(0) || arbiter == address(0) || seller == msg.sender) {
            revert BadAddress();
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
        if (msg.value == 0 || sellerBondRequired == 0 || inspectionSeconds == 0) {
            revert BadAmount();
        }
        if (intentHash == bytes32(0) || termsHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, intentHash, intentSignature);
        _requireSignature(msg.sender, termsHash, termsSignature);

        tradeId = nextTradeId++;
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
            state: State.EscrowFunded,
            intentHash: intentHash,
            termsHash: termsHash,
            itemFingerprintHash: bytes32(0),
            inventoryLockHash: bytes32(0),
            fingerprintChallengeHash: bytes32(0),
            routeHash: bytes32(0),
            routeWallBundleHash: bytes32(0),
            routeSpendabilityHash: bytes32(0),
            routeAssemblyHistoryHash: bytes32(0),
            routeAssemblyWitnessHash: bytes32(0),
            deliveryHash: bytes32(0),
            deliveryWitnessHash: bytes32(0),
            receiptHash: bytes32(0),
            proofCount: 0,
            evidenceCount: 0,
            verifierAttestationCount: 0,
            inPersonAllowed: false,
            insured: false,
            declaredInsurance: 0
        });
        _anchorPacketHash(tradeId, intentHash);
        _anchorPacketHash(tradeId, termsHash);

        emit TradeCreated(
            tradeId,
            msg.sender,
            seller,
            arbiter,
            msg.value,
            sellerBondRequired,
            disputeBondRequired,
            intentHash,
            termsHash
        );
    }

    function cancelBeforeSellerBond(
        uint256 tradeId,
        bytes32 reasonHash,
        bytes calldata reasonSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EscrowFunded) {
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

    function acceptAndBond(uint256 tradeId)
        external
        payable
        onlySeller(tradeId)
        inState(tradeId, State.EscrowFunded)
    {
        Trade storage trade = trades[tradeId];
        if (msg.value != trade.sellerBondRequired) revert WrongBondAmount();

        trade.sellerBondLocked = msg.value;
        trade.state = State.EvidencePending;

        emit SellerBonded(tradeId, msg.value);
    }

    function attachProof(uint256 tradeId, bytes32 proofHash, bytes calldata proofSignature)
        external
    {
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

    function attachEvidence(
        uint256 tradeId,
        EvidenceKind kind,
        bytes32 evidenceHash,
        bytes calldata evidenceSignature
    ) external {
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
        if (!IMarketplacePredicateVerifier(predicateVerifier)
                .verifyPredicate(predicateHash, publicInputs, proof)) {
            revert PredicateVerificationFailed(predicateVerifier, predicateHash);
        }
        _anchorPacketHash(tradeId, predicateHash);

        uint256 index = trade.evidenceCount++;
        evidenceHashes[tradeId][index] = predicateHash;

        emit EvidenceAttached(tradeId, msg.sender, kind, index, predicateHash);
        emit PredicateEvidenceAttached(
            tradeId, msg.sender, predicateVerifier, kind, index, predicateHash
        );
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
        if (
            trade.itemFingerprintHash != bytes32(0)
                && trade.itemFingerprintHash != itemFingerprintHash
        ) {
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
        _approveVerifierScope(
            tradeId, verifier, FINGERPRINT_SCOPE_SET_HASH, approvalHash, approvalSignature
        );
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
            verifierAttestationBindingHash(
                tradeId, attestationHash, subjectHash, scopeSetHash, methodIdHash
            ),
            attestationSignature
        );
        _anchorPacketHash(tradeId, attestationHash);

        uint256 index = trade.verifierAttestationCount++;
        verifierAttestationHashes[tradeId][index] = attestationHash;
        verifierAttestations[tradeId][attestationHash] = VerifierAttestation({
            verifier: msg.sender,
            subjectHash: subjectHash,
            scopeSetHash: scopeSetHash,
            methodIdHash: methodIdHash
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
            msg.sender,
            verifierScopeApprovalHash(tradeId, verifier, scopeSetHash, approvalHash),
            approvalSignature
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
            revert InventoryLockFingerprintMismatch(
                trade.itemFingerprintHash, boundItemFingerprintHash
            );
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

    function openFingerprintChallenge(
        uint256 tradeId,
        bytes32 challengeHash,
        bytes calldata challengeSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EvidencePending) {
        Trade storage trade = trades[tradeId];
        if (trade.itemFingerprintHash == bytes32(0)) revert ItemFingerprintMissing();
        if (challengeHash == bytes32(0)) revert BadHash();
        if (trade.fingerprintChallengeHash != bytes32(0)) {
            revert FingerprintChallengeActive(trade.fingerprintChallengeHash);
        }
        _requireSignature(msg.sender, challengeHash, challengeSignature);
        _anchorPacketHash(tradeId, challengeHash);

        trade.fingerprintChallengeHash = challengeHash;

        emit FingerprintChallengeOpened(tradeId, msg.sender, challengeHash);
    }

    function clearFingerprintChallenge(
        uint256 tradeId,
        bytes32 resolutionHash,
        bytes calldata resolutionSignature
    ) external onlyBuyer(tradeId) inState(tradeId, State.EvidencePending) {
        Trade storage trade = trades[tradeId];
        if (trade.fingerprintChallengeHash == bytes32(0)) revert FingerprintChallengeMissing();
        if (resolutionHash == bytes32(0)) revert BadHash();
        _requireSignature(msg.sender, resolutionHash, resolutionSignature);
        _anchorPacketHash(tradeId, resolutionHash);

        trade.fingerprintChallengeHash = bytes32(0);

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

        _requireSignature(
            msg.sender,
            fingerprintChallengeResolutionHash(
                tradeId, resolutionHash, challengeHash, attestationHash
            ),
            resolutionSignature
        );
        _anchorPacketHash(tradeId, resolutionHash);

        trade.fingerprintChallengeHash = bytes32(0);

        emit FingerprintChallengeCleared(tradeId, msg.sender, resolutionHash);
        emit FingerprintChallengeClearedWithAttestation(
            tradeId, msg.sender, resolutionHash, attestationHash
        );
    }

    function commitRoute(uint256, bytes32, bool, bool, uint256, bytes calldata) external pure {
        revert SpendabilityRequired();
    }

    function commitRoute(uint256, bytes32, bytes32, bool, bool, uint256, bytes calldata)
        external
        pure
    {
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
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 spendabilityHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash,
        bytes32 routeAssemblyWitnessHash_,
        bool inPersonAllowed,
        bool insured,
        uint256 declaredInsurance,
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
        if (trade.inventoryLockHash == bytes32(0)) revert InventoryLockMissing();
        if (trade.fingerprintChallengeHash != bytes32(0)) {
            revert FingerprintChallengeActive(trade.fingerprintChallengeHash);
        }
        bytes32 expectedSpendabilityHash = routeSpendabilityHash(
            tradeId, routeHash, wallBundleHash, assemblyHistoryHash, msg.sender
        );
        if (spendabilityHash != expectedSpendabilityHash) {
            revert SpendabilityDigestMismatch(expectedSpendabilityHash, spendabilityHash);
        }
        bytes32 expectedRouteAssemblyWitnessHash =
            routeAssemblyWitnessHash(
                tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash
            );
        if (routeAssemblyWitnessHash_ != expectedRouteAssemblyWitnessHash) {
            revert RouteAssemblyWitnessMismatch(
                expectedRouteAssemblyWitnessHash, routeAssemblyWitnessHash_
            );
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

        emit RouteCommitted(
            tradeId, routeHash, wallBundleHash, inPersonAllowed, insured, declaredInsurance
        );
        emit RouteWallBundleCommitted(tradeId, wallBundleHash, spendabilityHash);
        emit RouteAssemblyCommitted(
            tradeId,
            spendabilityHash,
            assemblyHistoryHash,
            wallBundleHash,
            routeAssemblyWitnessHash_
        );
    }

    function markRouteInProgress(uint256 tradeId)
        external
        onlySeller(tradeId)
        inState(tradeId, State.RouteLocked)
    {
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
        uint256 tradeId,
        bytes32 deliveryHash,
        bytes32 spendabilityHash,
        bytes32 deliveryWitnessHash_,
        bytes calldata deliverySignature
    ) external {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.seller && msg.sender != trade.arbiter) revert Unauthorized();
        if (trade.state != State.RouteLocked && trade.state != State.RouteInProgress) {
            revert BadState(trade.state);
        }
        if (deliveryHash == bytes32(0)) revert BadHash();
        if (deliveryWitnessHash_ == bytes32(0)) revert DeliveryWitnessRequired();
        bytes32 expectedSpendabilityHash =
            deliverySpendabilityHash(tradeId, deliveryHash, msg.sender);
        if (spendabilityHash != expectedSpendabilityHash) {
            revert SpendabilityDigestMismatch(expectedSpendabilityHash, spendabilityHash);
        }
        bytes32 expectedDeliveryWitnessHash =
            deliveryWitnessHash(tradeId, deliveryHash, spendabilityHash);
        if (deliveryWitnessHash_ != expectedDeliveryWitnessHash) {
            revert DeliveryWitnessMismatch(expectedDeliveryWitnessHash, deliveryWitnessHash_);
        }
        _requireSignature(msg.sender, deliveryHash, deliverySignature);
        _consumeSpendability(tradeId, spendabilityHash, DELIVERY_CONFIRMATION_GATE);
        _anchorPacketHash(tradeId, deliveryHash);

        trade.deliveryHash = deliveryHash;
        trade.deliveryWitnessHash = deliveryWitnessHash_;
        trade.deliveredAt = block.timestamp;
        trade.state = State.InspectionOpen;

        emit DeliveryWitnessCommitted(tradeId, deliveryWitnessHash_, spendabilityHash);
        emit InspectionOpened(
            tradeId, deliveryHash, block.timestamp, block.timestamp + trade.inspectionSeconds
        );
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

    function settleAfterInspection(uint256 tradeId)
        external
        inState(tradeId, State.InspectionOpen)
    {
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
        trade.state = State.ClaimOrDisputePending;

        emit ClaimOpened(tradeId, claimHash, msg.value);
    }

    function openRouteClaimAfterTimeout(
        uint256 tradeId,
        bytes32 claimHash,
        bytes calldata claimSignature
    ) external payable onlyBuyer(tradeId) {
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
        trade.state = State.ClaimOrDisputePending;

        emit RouteClaimOpened(tradeId, claimHash, msg.value);
        emit ClaimOpened(tradeId, claimHash, msg.value);
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

        Trade storage trade = trades[tradeId];
        _anchorPacketHash(tradeId, rulingHash);
        uint256 buyerRefund = (trade.escrowAmount * buyerRefundBps) / 10_000;
        uint256 sellerEscrowPayout = trade.escrowAmount - buyerRefund;
        uint256 sellerBondPenalty = (trade.sellerBondLocked * sellerBondPenaltyBps) / 10_000;
        uint256 sellerBondReturn = trade.sellerBondLocked - sellerBondPenalty;
        uint256 disputeBond = trade.disputeBondLocked;

        trade.state = State.Settled;
        _releaseTradeObjectLocks(tradeId);

        emit ClaimResolved(
            tradeId,
            rulingHash,
            buyerRefund,
            sellerEscrowPayout,
            sellerBondPenalty,
            returnDisputeBondToBuyer
        );
        emit TradeSettled(tradeId);

        _send(payable(trade.buyer), buyerRefund + sellerBondPenalty);
        _send(payable(trade.seller), sellerEscrowPayout + sellerBondReturn);

        if (returnDisputeBondToBuyer) {
            _send(payable(trade.buyer), disputeBond);
        } else {
            _send(payable(trade.seller), disputeBond);
        }
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

    function emergencyReplaceArbiter(
        uint256 tradeId,
        bytes32 proposalHash,
        bytes calldata arbiterAcceptanceSignature
    ) external inState(tradeId, State.ClaimOrDisputePending) {
        Trade storage trade = trades[tradeId];
        ArbiterReplacement storage approval = arbiterReplacementApprovals[tradeId][proposalHash];
        if (approval.proposedArbiter == address(0)) {
            revert ReplacementProposalMissing(proposalHash);
        }
        if (actorRegistry.isArbiterActive(trade.arbiter)) {
            revert ArbiterStillActive(trade.arbiter);
        }
        if (block.timestamp < uint256(approval.proposedAt) + ARBITER_REPLACEMENT_TIMEOUT) {
            revert ReplacementTimeoutOpen(uint256(approval.proposedAt)
                    + ARBITER_REPLACEMENT_TIMEOUT);
        }
        if (!actorRegistry.isArbiterActive(approval.proposedArbiter)) {
            revert UnregisteredArbiter(approval.proposedArbiter);
        }
        _requireSignature(
            approval.proposedArbiter, approval.proposalHash, arbiterAcceptanceSignature
        );

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
        return (
            trade.routeHash,
            trade.routeWallBundleHash,
            trade.inPersonAllowed,
            trade.insured,
            trade.declaredInsurance
        );
    }

    function getRouteAssembly(uint256 tradeId)
        external
        view
        returns (
            bytes32 routeSpendabilityHash_,
            bytes32 assemblyHistoryHash,
            bytes32 routeAssemblyWitnessHash_
        )
    {
        Trade storage trade = trades[tradeId];
        return (
            trade.routeSpendabilityHash,
            trade.routeAssemblyHistoryHash,
            trade.routeAssemblyWitnessHash
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
                routeHash,
                wallBundleHash,
                assemblyHistoryHash,
                trade.itemFingerprintHash,
                trade.inventoryLockHash
            )
        );
        return _spendabilityDigest(
            tradeId,
            ROUTE_COMMITMENT_GATE,
            ROUTE_COMMITMENT_LEG,
            boundArtifactsHash,
            issuer
        );
    }

    function inventoryLockBindingHash(
        uint256 tradeId,
        bytes32 inventoryLockHash,
        bytes32 itemFingerprintHash
    ) public view returns (bytes32) {
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

    function deliveryWitnessHash(
        uint256 tradeId,
        bytes32 deliveryHash,
        bytes32 spendabilityHash
    ) public view returns (bytes32) {
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
        return _spendabilityDigest(
            tradeId,
            DELIVERY_CONFIRMATION_GATE,
            DELIVERY_CONFIRMATION_LEG,
            boundArtifactsHash,
            issuer
        );
    }

    function verifierScopeApprovalHash(
        uint256 tradeId,
        address verifier,
        bytes32 scopeSetHash,
        bytes32 approvalHash
    ) public view returns (bytes32) {
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

    function _onlyParticipant(Trade storage trade) internal view {
        if (msg.sender != trade.buyer && msg.sender != trade.seller && msg.sender != trade.arbiter)
        {
            revert Unauthorized();
        }
    }

    function _onlyBuyerOrSeller(Trade storage trade) internal view {
        if (msg.sender != trade.buyer && msg.sender != trade.seller) {
            revert Unauthorized();
        }
    }

    function _onlyOpen(Trade storage trade) internal view {
        if (
            trade.state == State.None || trade.state == State.Settled
                || trade.state == State.Cancelled
        ) {
            revert ClosedTrade();
        }
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

    function _anchorPacketHash(uint256 tradeId, bytes32 packetHash) internal {
        if (packetHash == bytes32(0)) revert BadHash();
        if (anchoredPacketHashes[tradeId][packetHash]) revert DuplicatePacket(packetHash);
        anchoredPacketHashes[tradeId][packetHash] = true;
    }

    function _consumeSpendability(uint256 tradeId, bytes32 spendabilityHash, bytes32 gateHash)
        internal
    {
        if (spendabilityHash == bytes32(0)) revert SpendabilityRequired();
        if (consumedSpendabilityHashes[tradeId][spendabilityHash]) {
            revert SpendabilityAlreadyConsumed(spendabilityHash);
        }

        consumedSpendabilityHashes[tradeId][spendabilityHash] = true;
        _anchorPacketHash(tradeId, spendabilityHash);

        emit SpendabilityConsumed(tradeId, spendabilityHash, gateHash);
    }

    function _releaseTradeObjectLocks(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        bytes32 itemFingerprintHash = trade.itemFingerprintHash;
        if (
            itemFingerprintHash != bytes32(0)
                && activeItemFingerprints[itemFingerprintHash] == tradeId
        ) {
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

    function _send(address payable to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }

    function _requireSignature(address signer, bytes32 payloadHash, bytes calldata signature)
        internal
        view
    {
        if (!actorRegistry.verifyActorSignature(signer, payloadHash, signature)) {
            revert BadSignature(signer, payloadHash);
        }
    }
}
