// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "chain-src/MarketplaceActorRegistry.sol";
import "chain-src/MarketplaceEscrow.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function deal(address account, uint256 newBalance) external;
    function prank(address sender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes calldata revertData) external;
}

contract Domain2StitchedWitnessAudit {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MarketplaceActorRegistry internal registry;
    MarketplaceEscrow internal escrow;

    uint256 internal buyerKey = 0xB0B;
    uint256 internal sellerKey = 0x5E11;
    uint256 internal arbiterKey = 0xA9B;

    address internal buyer;
    address internal seller;
    address internal arbiter;

    function setUp() public {
        buyer = vm.addr(buyerKey);
        seller = vm.addr(sellerKey);
        arbiter = vm.addr(arbiterKey);

        registry = new MarketplaceActorRegistry();
        registry.registerActor(buyer, MarketplaceActorRegistry.Role.Buyer, _h("buyer"));
        registry.registerActor(seller, MarketplaceActorRegistry.Role.Seller, _h("seller"));
        registry.registerActor(arbiter, MarketplaceActorRegistry.Role.Arbiter, _h("arbiter"));
        registry.registerArbiter(arbiter, _h("arbiter-authority"), uint96(1 ether));

        escrow = new MarketplaceEscrow(address(registry));
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 100 ether);
        vm.deal(arbiter, 100 ether);
    }

    function testAuditRouteAcceptsCallerChosenStitchedAssemblyArtifacts() public {
        uint256 tradeId = _fundBondFingerprintAndInventory();

        bytes32 routeHash = _h("fresh-route-for-this-trade");
        bytes32 wallBundleHash = _h("wall-bundle-from-unrelated-context");
        bytes32 assemblyHistoryHash = _h("assembly-history-from-different-context");
        bytes32 spendabilityHash = _h("opaque-spendability-never-minted-from-this-packet");
        bytes32 witnessHash =
            escrow.routeAssemblyWitnessHash(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            spendabilityHash,
            wallBundleHash,
            assemblyHistoryHash,
            witnessHash,
            false,
            true,
            1 ether,
            _sig(sellerKey, routeHash)
        );

        (bytes32 storedSpendabilityHash, bytes32 storedAssemblyHistoryHash, bytes32 storedWitnessHash) =
            escrow.getRouteAssembly(tradeId);
        (bytes32 storedRouteHash, bytes32 storedWallBundleHash,,,) = escrow.getRoute(tradeId);

        _assertEq(uint256(escrow.getState(tradeId)), uint256(MarketplaceEscrow.State.RouteLocked));
        _assertEq(uint256(storedRouteHash), uint256(routeHash));
        _assertEq(uint256(storedWallBundleHash), uint256(wallBundleHash));
        _assertEq(uint256(storedSpendabilityHash), uint256(spendabilityHash));
        _assertEq(uint256(storedAssemblyHistoryHash), uint256(assemblyHistoryHash));
        _assertEq(uint256(storedWitnessHash), uint256(witnessHash));
        _assertTrue(escrow.consumedSpendabilityHashes(tradeId, spendabilityHash));
    }

    function testAuditRouteRejectsOnlyIfCallerChosenTupleDoesNotMatchWitness() public {
        uint256 tradeId = _fundBondFingerprintAndInventory();

        bytes32 routeHash = _h("fresh-route-control");
        bytes32 wallBundleHash = _h("wall-bundle-control");
        bytes32 assemblyHistoryHash = _h("assembly-history-control");
        bytes32 spendabilityHash = _h("opaque-spendability-control");
        bytes32 wrongWitnessHash =
            escrow.routeAssemblyWitnessHash(tradeId, routeHash, spendabilityHash, wallBundleHash, _h("other-assembly"));
        bytes32 expectedWitnessHash =
            escrow.routeAssemblyWitnessHash(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.RouteAssemblyWitnessMismatch.selector, expectedWitnessHash, wrongWitnessHash
            )
        );
        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            spendabilityHash,
            wallBundleHash,
            assemblyHistoryHash,
            wrongWitnessHash,
            false,
            true,
            1 ether,
            _sig(sellerKey, routeHash)
        );
    }

    function testAuditDeliveryAcceptsCallerChosenStitchedSpendability() public {
        uint256 tradeId = _fundBondFingerprintAndInventory();
        _lockMinimalRoute(tradeId);

        bytes32 deliveryHash = _h("delivery-record-for-current-route");
        bytes32 spendabilityHash = _h("opaque-delivery-spendability-from-unrelated-context");
        bytes32 witnessHash = escrow.deliveryWitnessHash(tradeId, deliveryHash, spendabilityHash);

        vm.prank(seller);
        escrow.markDelivered(tradeId, deliveryHash, spendabilityHash, witnessHash, _sig(sellerKey, deliveryHash));

        _assertEq(uint256(escrow.getState(tradeId)), uint256(MarketplaceEscrow.State.InspectionOpen));
        _assertTrue(escrow.consumedSpendabilityHashes(tradeId, spendabilityHash));
    }

    function _fundBondFingerprintAndInventory() internal returns (uint256 tradeId) {
        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");

        vm.prank(buyer);
        tradeId = escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );

        vm.prank(seller);
        escrow.acceptAndBond{value: 0.1 ether}(tradeId);

        bytes32 itemFingerprintHash = _h("seller-asserted-item-fingerprint");
        vm.prank(seller);
        escrow.commitItemFingerprint(tradeId, itemFingerprintHash, _sig(sellerKey, itemFingerprintHash));

        bytes32 inventoryLockHash = _h("seller-asserted-inventory-lock");
        bytes32 bindingHash = escrow.inventoryLockBindingHash(tradeId, inventoryLockHash, itemFingerprintHash);
        vm.prank(seller);
        escrow.commitInventoryLock(tradeId, inventoryLockHash, itemFingerprintHash, _sig(sellerKey, bindingHash));
    }

    function _lockMinimalRoute(uint256 tradeId) internal {
        bytes32 routeHash = _h("minimal-route");
        bytes32 spendabilityHash = _h("opaque-route-spendability");
        bytes32 wallBundleHash = _h("minimal-wall-bundle");
        bytes32 assemblyHistoryHash = _h("minimal-assembly-history");
        bytes32 witnessHash =
            escrow.routeAssemblyWitnessHash(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            spendabilityHash,
            wallBundleHash,
            assemblyHistoryHash,
            witnessHash,
            false,
            true,
            1 ether,
            _sig(sellerKey, routeHash)
        );
    }

    function _h(string memory value) internal pure returns (bytes32) {
        return keccak256(bytes(value));
    }

    function _sig(uint256 privateKey, bytes32 payloadHash) internal returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _assertTrue(bool value) internal pure {
        if (!value) revert("assert true failed");
    }

    function _assertEq(uint256 actual, uint256 expected) internal pure {
        if (actual != expected) revert("assert eq failed");
    }
}
