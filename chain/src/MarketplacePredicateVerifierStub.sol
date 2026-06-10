// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Local harness verifier for predicate-proof plumbing.
/// @dev This is deliberately not a real ZK verifier. It lets the protocol test
/// registered verifier-contract gates before a production circuit is wired in.
contract MarketplacePredicateVerifierStub {
    address public owner;

    mapping(bytes32 predicateHash => bool accepted) public acceptedPredicates;

    error Unauthorized();
    error BadHash();

    event PredicateAcceptanceSet(bytes32 indexed predicateHash, bool accepted);

    constructor() {
        owner = msg.sender;
    }

    function setPredicateAccepted(bytes32 predicateHash, bool accepted) external {
        if (msg.sender != owner) revert Unauthorized();
        if (predicateHash == bytes32(0)) revert BadHash();

        acceptedPredicates[predicateHash] = accepted;
        emit PredicateAcceptanceSet(predicateHash, accepted);
    }

    function verifyPredicate(bytes32 predicateHash, bytes calldata, bytes calldata proof)
        external
        view
        returns (bool)
    {
        return acceptedPredicates[predicateHash] && proof.length > 0;
    }
}
