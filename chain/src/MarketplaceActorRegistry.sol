// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Local registry for protocol actors, verifier authority, arbiter authority,
/// and actor packet signatures.
contract MarketplaceActorRegistry {
    enum Role {
        None,
        Buyer,
        Seller,
        Agent,
        Verifier,
        Arbiter,
        Attester
    }

    struct ActorRecord {
        Role role;
        bytes32 metadataHash;
        bool active;
        uint64 registeredAt;
        uint64 revokedAt;
    }

    struct AuthorityRecord {
        bytes32 metadataHash;
        uint96 bond;
        bool active;
        uint64 registeredAt;
        uint64 revokedAt;
    }

    struct LabelRecord {
        bytes32 metadataHash;
        bool active;
        uint64 registeredAt;
        uint64 revokedAt;
    }

    error Unauthorized();
    error BadAddress();
    error BadRole();
    error BadHash();
    error BadSignature();

    address public owner;

    mapping(address actor => ActorRecord) public actors;
    mapping(address verifier => AuthorityRecord) public verifiers;
    mapping(address arbiter => AuthorityRecord) public arbiters;
    mapping(address verifierContract => AuthorityRecord) public predicateVerifiers;
    mapping(bytes32 clusterId => LabelRecord) public controlClusters;
    mapping(bytes32 custodianId => LabelRecord) public custodians;
    mapping(address actor => bytes32 clusterId) private actorControlClusterIds;
    mapping(address actor => bytes32 custodianId) private actorCustodianIds;

    event ActorRegistered(address indexed actor, Role indexed role, bytes32 metadataHash);
    event ActorRevoked(address indexed actor);
    event VerifierRegistered(address indexed verifier, bytes32 metadataHash, uint96 bond);
    event VerifierRevoked(address indexed verifier);
    event ArbiterRegistered(address indexed arbiter, bytes32 metadataHash, uint96 bond);
    event ArbiterRevoked(address indexed arbiter);
    event PredicateVerifierRegistered(
        address indexed verifierContract, bytes32 metadataHash, uint96 bond
    );
    event PredicateVerifierRevoked(address indexed verifierContract);
    event ControlClusterRegistered(bytes32 indexed clusterId, bytes32 metadataHash);
    event ControlClusterRevoked(bytes32 indexed clusterId);
    event ActorControlClusterSet(address indexed actor, bytes32 indexed clusterId);
    event CustodianRegistered(bytes32 indexed custodianId, bytes32 metadataHash);
    event CustodianRevoked(bytes32 indexed custodianId);
    event ActorCustodianSet(address indexed actor, bytes32 indexed custodianId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerActor(address actor, Role role, bytes32 metadataHash) external onlyOwner {
        if (actor == address(0)) revert BadAddress();
        if (role == Role.None) revert BadRole();
        if (metadataHash == bytes32(0)) revert BadHash();

        actors[actor] = ActorRecord({
            role: role,
            metadataHash: metadataHash,
            active: true,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });

        emit ActorRegistered(actor, role, metadataHash);
    }

    function revokeActor(address actor) external onlyOwner {
        ActorRecord storage record = actors[actor];
        if (record.role == Role.None) revert BadRole();

        record.active = false;
        record.revokedAt = uint64(block.timestamp);

        emit ActorRevoked(actor);
    }

    function registerVerifier(address verifier, bytes32 metadataHash, uint96 bond)
        external
        onlyOwner
    {
        if (!isActorActive(verifier, Role.Verifier)) revert BadRole();
        if (metadataHash == bytes32(0)) revert BadHash();

        verifiers[verifier] = AuthorityRecord({
            metadataHash: metadataHash,
            bond: bond,
            active: true,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });

        emit VerifierRegistered(verifier, metadataHash, bond);
    }

    function revokeVerifier(address verifier) external onlyOwner {
        AuthorityRecord storage record = verifiers[verifier];
        if (!record.active) revert BadRole();

        record.active = false;
        record.revokedAt = uint64(block.timestamp);

        emit VerifierRevoked(verifier);
    }

    function registerArbiter(address arbiter, bytes32 metadataHash, uint96 bond)
        external
        onlyOwner
    {
        if (!isActorActive(arbiter, Role.Arbiter)) revert BadRole();
        if (metadataHash == bytes32(0)) revert BadHash();

        arbiters[arbiter] = AuthorityRecord({
            metadataHash: metadataHash,
            bond: bond,
            active: true,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });

        emit ArbiterRegistered(arbiter, metadataHash, bond);
    }

    function revokeArbiter(address arbiter) external onlyOwner {
        AuthorityRecord storage record = arbiters[arbiter];
        if (!record.active) revert BadRole();

        record.active = false;
        record.revokedAt = uint64(block.timestamp);

        emit ArbiterRevoked(arbiter);
    }

    function registerPredicateVerifier(address verifierContract, bytes32 metadataHash, uint96 bond)
        external
        onlyOwner
    {
        if (verifierContract == address(0)) revert BadAddress();
        if (metadataHash == bytes32(0)) revert BadHash();

        predicateVerifiers[verifierContract] = AuthorityRecord({
            metadataHash: metadataHash,
            bond: bond,
            active: true,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });

        emit PredicateVerifierRegistered(verifierContract, metadataHash, bond);
    }

    function revokePredicateVerifier(address verifierContract) external onlyOwner {
        AuthorityRecord storage record = predicateVerifiers[verifierContract];
        if (!record.active) revert BadRole();

        record.active = false;
        record.revokedAt = uint64(block.timestamp);

        emit PredicateVerifierRevoked(verifierContract);
    }

    function registerControlCluster(bytes32 clusterId, bytes32 metadataHash) external onlyOwner {
        if (clusterId == bytes32(0) || metadataHash == bytes32(0)) revert BadHash();

        controlClusters[clusterId] = LabelRecord({
            metadataHash: metadataHash,
            active: true,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });

        emit ControlClusterRegistered(clusterId, metadataHash);
    }

    function revokeControlCluster(bytes32 clusterId) external onlyOwner {
        LabelRecord storage record = controlClusters[clusterId];
        if (!record.active) revert BadHash();

        record.active = false;
        record.revokedAt = uint64(block.timestamp);

        emit ControlClusterRevoked(clusterId);
    }

    function setActorControlCluster(address actor, bytes32 clusterId) external onlyOwner {
        if (!actors[actor].active) revert BadRole();
        if (!controlClusters[clusterId].active) revert BadHash();

        actorControlClusterIds[actor] = clusterId;

        emit ActorControlClusterSet(actor, clusterId);
    }

    function registerCustodian(bytes32 custodianId, bytes32 metadataHash) external onlyOwner {
        if (custodianId == bytes32(0) || metadataHash == bytes32(0)) revert BadHash();

        custodians[custodianId] = LabelRecord({
            metadataHash: metadataHash,
            active: true,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });

        emit CustodianRegistered(custodianId, metadataHash);
    }

    function revokeCustodian(bytes32 custodianId) external onlyOwner {
        LabelRecord storage record = custodians[custodianId];
        if (!record.active) revert BadHash();

        record.active = false;
        record.revokedAt = uint64(block.timestamp);

        emit CustodianRevoked(custodianId);
    }

    function setActorCustodian(address actor, bytes32 custodianId) external onlyOwner {
        if (!actors[actor].active) revert BadRole();
        if (!custodians[custodianId].active) revert BadHash();

        actorCustodianIds[actor] = custodianId;

        emit ActorCustodianSet(actor, custodianId);
    }

    function isActorActive(address actor, Role role) public view returns (bool) {
        ActorRecord storage record = actors[actor];
        return record.active && record.role == role;
    }

    function isVerifierActive(address verifier) external view returns (bool) {
        return verifiers[verifier].active && isActorActive(verifier, Role.Verifier);
    }

    function isArbiterActive(address arbiter) external view returns (bool) {
        return arbiters[arbiter].active && isActorActive(arbiter, Role.Arbiter);
    }

    function isPredicateVerifierActive(address verifierContract) external view returns (bool) {
        return predicateVerifiers[verifierContract].active;
    }

    function isControlClusterActive(bytes32 clusterId) external view returns (bool) {
        return controlClusters[clusterId].active;
    }

    function isCustodianActive(bytes32 custodianId) external view returns (bool) {
        return custodians[custodianId].active;
    }

    function actorControlClusterId(address actor) external view returns (bytes32) {
        return actorControlClusterIds[actor];
    }

    function actorCustodianId(address actor) external view returns (bytes32) {
        return actorCustodianIds[actor];
    }

    function verifyActorSignature(address actor, bytes32 payloadHash, bytes calldata signature)
        external
        view
        returns (bool)
    {
        return actors[actor].active && recoverEthSignedMessage(payloadHash, signature) == actor;
    }

    function requireActorSignature(address actor, bytes32 payloadHash, bytes calldata signature)
        external
        view
    {
        if (!actors[actor].active) revert BadRole();
        if (recoverEthSignedMessage(payloadHash, signature) != actor) revert BadSignature();
    }

    function recoverEthSignedMessage(bytes32 payloadHash, bytes calldata signature)
        public
        pure
        returns (address)
    {
        if (signature.length != 65) revert BadSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert BadSignature();

        bytes32 digest = toEthSignedMessageHash(payloadHash);
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }

    function toEthSignedMessageHash(bytes32 payloadHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
    }
}
