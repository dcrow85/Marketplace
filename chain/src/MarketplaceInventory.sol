// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice The owned-collection ("inventory") registry — the enforced spine for
/// owned card instances, separate from the trade-time escrow/inventory-lock.
/// @dev It anchors three things and nothing more: the ownership RECORD, transfer
/// validity (owner-signed, non-replayable per item), and the custody-attestation
/// BINDING (which custodian, which attestation hash). It does NOT verify the
/// physical card — authenticity, condition, and possession truth stay off-chain
/// (judged). Each instance binds to a catalog row by a single hash
/// (catalog_hash + row_id + row_hash); the contract never stores rows.
contract MarketplaceInventory {
    enum Custody {
        SelfHeld,
        Shop,
        Vault
    }

    struct Item {
        bool exists;
        bool locked;
        Custody custody;
        address owner;
        address custodian; // address(0) when self-held
        bytes32 catalogCitation; // hash binding to the exact catalog row
        bytes32 attestation; // custody attestation hash; 0 until the custodian attests
        uint64 transferNonce; // increments per transfer (replay protection)
    }

    mapping(bytes32 instanceId => Item) public items;

    event ItemRegistered(bytes32 indexed instanceId, address indexed owner, bytes32 catalogCitation);
    event ItemTransferred(bytes32 indexed instanceId, address indexed from, address indexed to, uint64 nonce);
    event CustodyAssigned(bytes32 indexed instanceId, address indexed custodian, Custody custody);
    event CustodyAttested(bytes32 indexed instanceId, address indexed custodian, bytes32 attestation);
    event CustodyReleased(bytes32 indexed instanceId, address indexed by);
    event ItemLocked(bytes32 indexed instanceId);
    event ItemUnlocked(bytes32 indexed instanceId);

    error AlreadyRegistered(bytes32 instanceId);
    error NotRegistered(bytes32 instanceId);
    error NotOwner(bytes32 instanceId, address caller);
    error NotCustodian(bytes32 instanceId, address caller);
    error ItemIsLocked(bytes32 instanceId);
    error ItemNotLocked(bytes32 instanceId);
    error SelfCustodyCannotAttest(bytes32 instanceId);
    error CustodyNotAssigned(bytes32 instanceId);
    error StaleTransferNonce(bytes32 instanceId, uint64 expected, uint64 provided);
    error ZeroAddress();
    error EmptyCitation();

    modifier onlyOwner(bytes32 id) {
        if (!items[id].exists) revert NotRegistered(id);
        if (items[id].owner != msg.sender) revert NotOwner(id, msg.sender);
        _;
    }

    /// @notice Register an owned instance bound to a catalog row. Caller becomes owner; self-held.
    function register(bytes32 instanceId, bytes32 catalogCitation) external {
        if (items[instanceId].exists) revert AlreadyRegistered(instanceId);
        if (catalogCitation == bytes32(0)) revert EmptyCitation();
        Item storage it = items[instanceId];
        it.exists = true;
        it.owner = msg.sender;
        it.custody = Custody.SelfHeld;
        it.catalogCitation = catalogCitation;
        emit ItemRegistered(instanceId, msg.sender, catalogCitation);
    }

    /// @notice Owner transfers ownership. The owner's tx is the signature; the
    /// per-item nonce makes it non-replayable. A transfer drops any custody
    /// attestation — the new owner re-declares where it lives.
    function transfer(bytes32 instanceId, address to, uint64 nonce) external onlyOwner(instanceId) {
        Item storage it = items[instanceId];
        if (it.locked) revert ItemIsLocked(instanceId);
        if (to == address(0)) revert ZeroAddress();
        if (nonce != it.transferNonce) revert StaleTransferNonce(instanceId, it.transferNonce, nonce);
        address from = it.owner;
        it.owner = to;
        it.transferNonce = nonce + 1;
        if (it.custody != Custody.SelfHeld) {
            it.custody = Custody.SelfHeld;
            it.custodian = address(0);
            it.attestation = bytes32(0);
            emit CustodyReleased(instanceId, from);
        }
        emit ItemTransferred(instanceId, from, to, nonce);
    }

    /// @notice Owner declares where the item is held (a shop/vault custodian).
    /// Self-held clears any custodian. A non-self assignment must be re-attested.
    function assignCustody(bytes32 instanceId, Custody custody, address custodian)
        external
        onlyOwner(instanceId)
    {
        Item storage it = items[instanceId];
        if (it.locked) revert ItemIsLocked(instanceId);
        if (custody == Custody.SelfHeld) {
            it.custody = Custody.SelfHeld;
            it.custodian = address(0);
            it.attestation = bytes32(0);
            emit CustodyReleased(instanceId, msg.sender);
            return;
        }
        if (custodian == address(0)) revert ZeroAddress();
        it.custody = custody;
        it.custodian = custodian;
        it.attestation = bytes32(0);
        emit CustodyAssigned(instanceId, custodian, custody);
    }

    /// @notice The assigned custodian binds its attestation hash. The attestation
    /// CONTENT (what the shop vouches) is off-chain/legible; the contract binds
    /// only which custodian signed which hash.
    function attestCustody(bytes32 instanceId, bytes32 attestation) external {
        Item storage it = items[instanceId];
        if (!it.exists) revert NotRegistered(instanceId);
        if (it.custody == Custody.SelfHeld) revert SelfCustodyCannotAttest(instanceId);
        if (it.custodian == address(0)) revert CustodyNotAssigned(instanceId);
        if (msg.sender != it.custodian) revert NotCustodian(instanceId, msg.sender);
        it.attestation = attestation;
        emit CustodyAttested(instanceId, msg.sender, attestation);
    }

    /// @notice Owner locks the item (e.g. pending a trade/swap); transfers blocked while locked.
    function lock(bytes32 instanceId) external onlyOwner(instanceId) {
        Item storage it = items[instanceId];
        if (it.locked) revert ItemIsLocked(instanceId);
        it.locked = true;
        emit ItemLocked(instanceId);
    }

    function unlock(bytes32 instanceId) external onlyOwner(instanceId) {
        Item storage it = items[instanceId];
        if (!it.locked) revert ItemNotLocked(instanceId);
        it.locked = false;
        emit ItemUnlocked(instanceId);
    }

    // --------------------------------------------------------------------- //
    // views
    // --------------------------------------------------------------------- //
    function ownerOf(bytes32 instanceId) external view returns (address) {
        if (!items[instanceId].exists) revert NotRegistered(instanceId);
        return items[instanceId].owner;
    }

    /// @notice True only when a non-self custodian has bound an attestation —
    /// i.e. custody is enforceably attested, not merely claimed.
    function isCustodyAttested(bytes32 instanceId) external view returns (bool) {
        Item storage it = items[instanceId];
        return it.exists && it.custody != Custody.SelfHeld && it.custodian != address(0)
            && it.attestation != bytes32(0);
    }
}
