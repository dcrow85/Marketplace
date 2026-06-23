// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketplaceActorRegistry} from "../src/MarketplaceActorRegistry.sol";
import {MarketplaceEscrow} from "../src/MarketplaceEscrow.sol";
import {MarketplacePredicateVerifierStub} from "../src/MarketplacePredicateVerifierStub.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function deal(address account, uint256 newBalance) external;
    function prank(address sender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function roll(uint256 newBlockNumber) external;
    function warp(uint256 newTimestamp) external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert(bytes4 selector) external;
}

contract MarketplaceEscrowTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MarketplaceActorRegistry internal registry;
    MarketplaceEscrow internal escrow;
    MarketplacePredicateVerifierStub internal predicateVerifier;

    uint256 internal buyerKey = 0xB0B;
    uint256 internal sellerKey = 0x5E11;
    uint256 internal arbiterKey = 0xA9B;
    uint256 internal verifierKey = 0x9E7;
    uint256 internal replacementArbiterKey = 0xA9B2;
    uint256 internal floorPanelMemberKey = 0xF10012;

    address internal buyer;
    address internal seller;
    address internal arbiter;
    address internal verifier;
    address internal replacementArbiter;
    address internal floorPanelMember;
    address internal stranger = address(0xBAD);
    mapping(uint256 tradeId => bytes32 itemFingerprintHash) internal committedItemFingerprints;
    mapping(uint256 tradeId => bytes32 inventoryLockHash) internal committedInventoryLocks;
    mapping(uint256 tradeId => bytes32 routeHash) internal committedRouteHashes;
    mapping(uint256 tradeId => bytes32 routeAssemblyWitnessHash) internal committedRouteAssemblyWitnesses;
    mapping(uint256 tradeId => bytes32 alphaPolicySnapshots) internal committedAlphaPolicySnapshots;

    function setUp() public {
        buyer = vm.addr(buyerKey);
        seller = vm.addr(sellerKey);
        arbiter = vm.addr(arbiterKey);
        verifier = vm.addr(verifierKey);
        replacementArbiter = vm.addr(replacementArbiterKey);
        floorPanelMember = vm.addr(floorPanelMemberKey);

        registry = new MarketplaceActorRegistry();
        registry.registerActor(buyer, MarketplaceActorRegistry.Role.Buyer, _h("buyer-actor"));
        registry.registerActor(seller, MarketplaceActorRegistry.Role.Seller, _h("seller-actor"));
        registry.registerActor(arbiter, MarketplaceActorRegistry.Role.Arbiter, _h("arbiter-actor"));
        registry.registerActor(verifier, MarketplaceActorRegistry.Role.Verifier, _h("verifier-actor"));
        registry.registerActor(
            replacementArbiter, MarketplaceActorRegistry.Role.Arbiter, _h("replacement-arbiter-actor")
        );
        registry.registerActor(floorPanelMember, MarketplaceActorRegistry.Role.Arbiter, _h("floor-panel-member-actor"));
        registry.registerArbiter(arbiter, _h("arbiter-authority"), uint96(1 ether));
        registry.registerArbiter(replacementArbiter, _h("replacement-arbiter-authority"), uint96(1 ether));
        registry.registerArbiter(floorPanelMember, _h("floor-panel-member-authority"), uint96(1 ether));
        registry.registerVerifier(verifier, _h("verifier-authority"), uint96(0.5 ether));

        escrow = new MarketplaceEscrow(address(registry));
        predicateVerifier = new MarketplacePredicateVerifierStub();
        registry.registerPredicateVerifier(address(predicateVerifier), _h("predicate-verifier"), 0);
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 100 ether);
        vm.deal(arbiter, 100 ether);
        vm.deal(verifier, 100 ether);
        vm.deal(replacementArbiter, 100 ether);
        vm.deal(floorPanelMember, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    function testCleanCloseReleasesEscrowAndSellerBond() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 evidenceHash = _h("front-back-scan");
        vm.prank(seller);
        escrow.attachEvidence(tradeId, MarketplaceEscrow.EvidenceKind.Item, evidenceHash, _sig(sellerKey, evidenceHash));
        bytes32 routeHash = _h("tracking:insured-usps");
        bytes32 spendabilityHash = _commitRoute(tradeId, routeHash, false, true, 1 ether);
        _assertTrue(escrow.consumedSpendabilityHashes(tradeId, spendabilityHash), "route spendability consumed");
        vm.prank(seller);
        escrow.markRouteInProgress(tradeId);
        _markDeliveredBySeller(tradeId, "delivery:happy-path");

        uint256 sellerBefore = seller.balance;
        bytes32 receiptHash = _h("receipt:buyer-happy");
        vm.prank(buyer);
        escrow.buyerAccept(tradeId, receiptHash, _sig(buyerKey, receiptHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(seller.balance - sellerBefore, 1.1 ether, "seller receives escrow plus bond");
        _assertEq(address(escrow).balance, 0, "contract fully drained");
    }

    function testNewSellerClaimCanUseBondAndDisputeBond() public {
        uint256 tradeId = _createAndBond(1 ether, 0.2 ether, 0.02 ether);

        bytes32 proofHash = _h("new-seller-shop-website-signed-proof");
        vm.prank(seller);
        escrow.attachProof(tradeId, proofHash, _sig(sellerKey, proofHash));
        bytes32 routeHash = _h("route:tracking-memo-low-confidence");
        _commitRoute(tradeId, routeHash, false, false, 0);
        _markDeliveredBySeller(tradeId, "delivery:new-seller-claim");

        uint256 buyerBefore = buyer.balance;
        uint256 sellerBefore = seller.balance;

        bytes32 claimHash = _h("claim:wrong-condition");
        vm.prank(buyer);
        escrow.openClaim{value: 0.02 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _commitDefaultPostHandoffRemedy(tradeId, 1 ether);
        bytes32 rulingHash = _h("ruling:partial-refund-bond-penalty");
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 6_000, 5_000, true, _sig(arbiterKey, rulingHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 0.7 ether, "buyer gets refund plus bond penalty");
        _assertEq(seller.balance - sellerBefore, 0.5 ether, "seller keeps remainder plus bond return");
        _assertEq(address(escrow).balance, 0, "contract fully drained");
    }

    function testInspectionWindowCanAutoSettle() public {
        uint256 tradeId = _createAndBond(2 ether, 0.5 ether, 0.02 ether);

        bytes32 routeHash = _h("route:pickup-at-show");
        _commitRoute(tradeId, routeHash, true, false, 0);
        _markDeliveredByArbiter(tradeId, "delivery:show-pickup-arbiter");

        uint256 sellerBefore = seller.balance;
        vm.warp(block.timestamp + 3 days);
        escrow.settleAfterInspection(tradeId);

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(seller.balance - sellerBefore, 2.5 ether, "seller receives after window");
    }

    function testRouteCanRepresentInPersonOrShipping() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routePacketHash = _h("route:local-meetup");
        _commitRoute(tradeId, routePacketHash, true, false, 0);

        (bytes32 routeHash, bytes32 wallBundleHash, bool inPersonAllowed, bool insured, uint256 declaredInsurance) =
            escrow.getRoute(tradeId);
        _assertEq(uint256(routeHash), uint256(_h("route:local-meetup")), "route hash stored");
        _assertEq(
            uint256(wallBundleHash),
            uint256(_routeWallBundleRoot(tradeId, routePacketHash)),
            "route wall bundle root stored"
        );
        _assertTrue(inPersonAllowed, "in-person allowed");
        _assertTrue(!insured, "not insured");
        _assertEq(declaredInsurance, 0, "no insurance declared");

        (bytes32 routeSpendabilityHash, bytes32 assemblyHistoryHash, bytes32 routeAssemblyWitnessHash) =
            escrow.getRouteAssembly(tradeId);
        _assertEq(
            uint256(routeSpendabilityHash),
            uint256(_routeSpendability(tradeId, routePacketHash)),
            "route spendability stored"
        );
        _assertEq(
            uint256(assemblyHistoryHash),
            uint256(_routeAssemblyHistory(tradeId, routePacketHash)),
            "assembly history stored"
        );
        _assertEq(
            uint256(routeAssemblyWitnessHash),
            uint256(
                _routeAssemblyWitness(
                    tradeId, routePacketHash, routeSpendabilityHash, wallBundleHash, assemblyHistoryHash
                )
            ),
            "route assembly witness stored"
        );
    }

    function testInsuredRouteRequiresDeclaredCoverage() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        vm.expectRevert(MarketplaceEscrow.BadAmount.selector);
        bytes32 routeHash = _h("route:bad-insurance");
        _commitRoute(tradeId, routeHash, false, true, 0);
    }

    function testRouteCommitRequiresSpendability() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:missing-spendability");
        vm.expectRevert(MarketplaceEscrow.SpendabilityRequired.selector);
        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            bytes32(0),
            _routeWallBundleRoot(tradeId, routeHash),
            false,
            true,
            1 ether,
            _sig(sellerKey, routeHash)
        );
    }

    function testRouteCommitRequiresWallBundle() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:missing-wall-bundle");
        bytes32 spendabilityHash = _routeSpendability(tradeId, routeHash);
        vm.expectRevert(MarketplaceEscrow.WallBundleRequired.selector);
        vm.prank(seller);
        escrow.commitRoute(
            tradeId, routeHash, spendabilityHash, bytes32(0), false, true, 1 ether, _sig(sellerKey, routeHash)
        );
    }

    function testOldWallBundleRouteCommitAbiRequiresAssemblyHistory() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:old-wall-bundle-abi-no-assembly");
        bytes32 spendabilityHash = _routeSpendability(tradeId, routeHash);
        vm.expectRevert(MarketplaceEscrow.AssemblyHistoryRequired.selector);
        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            spendabilityHash,
            _routeWallBundleRoot(tradeId, routeHash),
            false,
            true,
            1 ether,
            _sig(sellerKey, routeHash)
        );
    }

    function testRouteCommitRequiresAssemblyHistory() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:missing-assembly-history");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        bytes32 spendabilityHash = _routeSpendability(
            tradeId, routeHash, _routeWallBundleRoot(tradeId, routeHash), bytes32(0), typedSpendability
        );
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        vm.expectRevert(MarketplaceEscrow.AssemblyHistoryRequired.selector);
        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            spendabilityHash,
            wallBundleHash,
            bytes32(0),
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, bytes32(0)),
            false,
            true,
            1 ether,
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
    }

    function testRouteCommitRequiresTypedAssemblyWitness() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:typed-assembly-witness");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        bytes32 assemblyHistoryHash = _routeAssemblyHistory(tradeId, routeHash);
        bytes32 spendabilityHash =
            _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 wrongAssemblyHistoryHash = _h("assembly:stale");
        bytes32 wrongWitnessHash =
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, wrongAssemblyHistoryHash);
        bytes memory expected = abi.encodeWithSelector(
            MarketplaceEscrow.RouteAssemblyWitnessMismatch.selector,
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash),
            wrongWitnessHash
        );

        vm.expectRevert(expected);
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
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
    }

    function testRouteCommitAcceptsTypedSpendabilityDigest() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:typed-spendability-positive");
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        bytes32 assemblyHistoryHash = _routeAssemblyHistory(tradeId, routeHash);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        bytes32 spendabilityHash =
            _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 witnessHash =
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

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
            typedSpendability,
            _sig(sellerKey, routeHash)
        );

        _assertState(tradeId, MarketplaceEscrow.State.RouteLocked);
        _assertTrue(escrow.consumedSpendabilityHashes(tradeId, spendabilityHash), "typed route spendability consumed");
    }

    function testAuditStitchedWitnessOpaqueRouteSpendabilityNowReverts() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:audit-stitched-opaque-spendability");
        bytes32 wallBundleHash = _h("wall-bundle:unrelated-context");
        bytes32 assemblyHistoryHash = _h("assembly-history:different-context");
        bytes32 opaqueSpendabilityHash = _h("opaque-spendability:not-minted-by-contract");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        bytes32 expectedSpendabilityHash =
            _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 witnessHash =
            _routeAssemblyWitness(tradeId, routeHash, opaqueSpendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.SpendabilityDigestMismatch.selector, expectedSpendabilityHash, opaqueSpendabilityHash
            )
        );
        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            opaqueSpendabilityHash,
            wallBundleHash,
            assemblyHistoryHash,
            witnessHash,
            false,
            true,
            1 ether,
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
    }

    function testOldSpendabilityRouteCommitAbiRequiresWallBundle() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:old-spendability-abi-no-wall-bundle");
        bytes32 spendabilityHash = _routeSpendability(tradeId, routeHash);
        vm.expectRevert(MarketplaceEscrow.WallBundleRequired.selector);
        vm.prank(seller);
        escrow.commitRoute(tradeId, routeHash, spendabilityHash, false, true, 1 ether, _sig(sellerKey, routeHash));
    }

    function testOldRouteCommitAbiRequiresSpendability() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:old-abi-no-spendability");
        vm.expectRevert(MarketplaceEscrow.SpendabilityRequired.selector);
        vm.prank(seller);
        escrow.commitRoute(tradeId, routeHash, false, true, 1 ether, _sig(sellerKey, routeHash));
    }

    function testSellerCannotMutateRouteAfterCommit() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:first");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.BadState.selector, MarketplaceEscrow.State.RouteLocked)
        );
        bytes32 mutationHash = _h("route:mutation");
        _commitRoute(tradeId, mutationHash, false, true, 1 ether);
    }

    function testRouteRequiresInventoryLock() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:route-requires-inventory"));

        vm.expectRevert(MarketplaceEscrow.InventoryLockMissing.selector);
        bytes32 routeHash = _h("route:without-inventory-lock");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
    }

    function testInventoryLockRequiresItemFingerprint() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);

        bytes32 inventoryLockHash = _h("inventory:missing-fingerprint");
        bytes32 boundItemFingerprintHash = _h("fingerprint:not-committed");
        bytes32 bindingHash = escrow.inventoryLockBindingHash(tradeId, inventoryLockHash, boundItemFingerprintHash);
        vm.expectRevert(MarketplaceEscrow.ItemFingerprintMissing.selector);
        vm.prank(seller);
        escrow.commitInventoryLock(tradeId, inventoryLockHash, boundItemFingerprintHash, _sig(sellerKey, bindingHash));
    }

    function testInventoryLockRequiresCommittedFingerprintBinding() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        bytes32 itemFingerprintHash = _h("fingerprint:binding-required");
        bytes32 wrongFingerprintHash = _h("fingerprint:wrong-binding");
        bytes32 inventoryLockHash = _h("inventory:binding-required");
        _commitItemFingerprint(tradeId, itemFingerprintHash);

        bytes32 bindingHash = escrow.inventoryLockBindingHash(tradeId, inventoryLockHash, wrongFingerprintHash);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.InventoryLockFingerprintMismatch.selector, itemFingerprintHash, wrongFingerprintHash
            )
        );
        vm.prank(seller);
        escrow.commitInventoryLock(tradeId, inventoryLockHash, wrongFingerprintHash, _sig(sellerKey, bindingHash));
    }

    function testInventoryLockRejectsOldUnboundSignature() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        bytes32 itemFingerprintHash = _h("fingerprint:old-unbound-signature");
        bytes32 inventoryLockHash = _h("inventory:old-unbound-signature");
        _commitItemFingerprint(tradeId, itemFingerprintHash);

        bytes32 bindingHash = escrow.inventoryLockBindingHash(tradeId, inventoryLockHash, itemFingerprintHash);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, seller, bindingHash));
        vm.prank(seller);
        escrow.commitInventoryLock(tradeId, inventoryLockHash, itemFingerprintHash, _sig(sellerKey, inventoryLockHash));
    }

    function testVerifierCanCommitItemFingerprint() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        bytes32 itemFingerprintHash = _h("fingerprint:verifier-committed");
        _approveFingerprintVerifier(tradeId, verifier);

        vm.prank(verifier);
        escrow.commitItemFingerprint(tradeId, itemFingerprintHash, _sig(verifierKey, itemFingerprintHash));

        _assertEq(escrow.activeItemFingerprints(itemFingerprintHash), tradeId, "verifier fingerprint is active");
    }

    function testGlobalVerifierCannotCommitUnapprovedItemFingerprint() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        bytes32 itemFingerprintHash = _h("fingerprint:verifier-unapproved");

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnapprovedFingerprintVerifier.selector, verifier));
        vm.prank(verifier);
        escrow.commitItemFingerprint(tradeId, itemFingerprintHash, _sig(verifierKey, itemFingerprintHash));
    }

    function testFraudSellerCannotUseSameItemFingerprintAcrossActiveTrades() public {
        bytes32 itemFingerprintHash = _h("fingerprint:psa-cert-12345678");
        uint256 firstTradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(firstTradeId, itemFingerprintHash);
        _commitInventoryLock(firstTradeId, _h("inventory:first-lock-same-fingerprint"));

        uint256 secondTradeId = _createAndBondWithoutInventoryLock(1.1 ether, 0.2 ether, 0.02 ether);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.ItemFingerprintAlreadyLocked.selector, itemFingerprintHash, firstTradeId
            )
        );
        _commitItemFingerprint(secondTradeId, itemFingerprintHash);
    }

    function testFraudSellerCannotUseSameInventoryLockAcrossActiveTrades() public {
        bytes32 inventoryLockHash = _h("inventory:unique:japanese-vending-mewtwo");
        uint256 firstTradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(firstTradeId, _h("fingerprint:first-trade"));
        _commitInventoryLock(firstTradeId, inventoryLockHash);

        uint256 secondTradeId = _createAndBondWithoutInventoryLock(1.1 ether, 0.2 ether, 0.02 ether);
        bytes32 secondItemFingerprintHash = _h("fingerprint:second-trade");
        _commitItemFingerprint(secondTradeId, secondItemFingerprintHash);
        bytes32 secondBindingHash =
            escrow.inventoryLockBindingHash(secondTradeId, inventoryLockHash, secondItemFingerprintHash);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.InventoryAlreadyLocked.selector, inventoryLockHash, firstTradeId)
        );
        vm.prank(seller);
        escrow.commitInventoryLock(
            secondTradeId, inventoryLockHash, secondItemFingerprintHash, _sig(sellerKey, secondBindingHash)
        );
    }

    function testInventoryLockReleasesAfterClaimResolution() public {
        bytes32 itemFingerprintHash = _h("fingerprint:released-after-resolution");
        bytes32 inventoryLockHash = _h("inventory:released-after-resolution");
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(tradeId, itemFingerprintHash);
        _commitInventoryLock(tradeId, inventoryLockHash);

        bytes32 routeHash = _h("route:inventory-release-claim");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        _markDeliveredBySeller(tradeId, "delivery:inventory-release-claim");

        bytes32 claimHash = _h("claim:inventory-release");
        vm.prank(buyer);
        escrow.openClaim{value: 0.02 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _commitDefaultPostHandoffRemedy(tradeId, 1 ether);

        bytes32 rulingHash = _h("ruling:inventory-release");
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 10_000, 10_000, true, _sig(arbiterKey, rulingHash));

        _assertEq(escrow.activeInventoryLocks(inventoryLockHash), 0, "inventory lock released");
        _assertEq(escrow.activeItemFingerprints(itemFingerprintHash), 0, "fingerprint released");
    }

    function testFingerprintChallengeBlocksRouteUntilBuyerClears() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        bytes32 itemFingerprintHash = _h("fingerprint:challenge-route-gate");
        _commitItemFingerprint(tradeId, itemFingerprintHash);
        _commitInventoryLock(tradeId, _h("inventory:challenge-route-gate"));

        bytes32 challengeHash = _h("fingerprint-challenge:need-fresh-nonce-photo");
        vm.prank(buyer);
        escrow.openFingerprintChallenge(
            tradeId, challengeHash, _challengeResolutionScope(), _sig(buyerKey, challengeHash)
        );

        bytes32 routeHash = _h("route:blocked-by-fingerprint-challenge");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.FingerprintChallengeActive.selector, challengeHash));
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:buyer-waiver-after-nonce");
        vm.prank(buyer);
        escrow.clearFingerprintChallenge(tradeId, resolutionHash, _sig(buyerKey, resolutionHash));

        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        _assertState(tradeId, MarketplaceEscrow.State.RouteLocked);
    }

    function testFingerprintChallengeRequiresCommittedFingerprint() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);

        bytes32 challengeHash = _h("fingerprint-challenge:before-fingerprint");
        vm.expectRevert(MarketplaceEscrow.ItemFingerprintMissing.selector);
        vm.prank(buyer);
        escrow.openFingerprintChallenge(
            tradeId, challengeHash, _challengeResolutionScope(), _sig(buyerKey, challengeHash)
        );
    }

    function testSellerCannotOpenFingerprintChallenge() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:seller-cannot-challenge"));

        bytes32 challengeHash = _h("fingerprint-challenge:seller-grief");
        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        vm.prank(seller);
        escrow.openFingerprintChallenge(
            tradeId, challengeHash, _challengeResolutionScope(), _sig(sellerKey, challengeHash)
        );
    }

    function testFingerprintChallengeCanClearWithVerifierAttestation() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:verifier-cure"));
        _commitInventoryLock(tradeId, _h("inventory:verifier-cure"));

        bytes32 challengeHash = _h("fingerprint-challenge:fresh-nonce-needed");
        bytes32 scopeSetHash = _challengeResolutionScope();
        vm.prank(buyer);
        escrow.openFingerprintChallenge(tradeId, challengeHash, scopeSetHash, _sig(buyerKey, challengeHash));

        bytes32 methodIdHash = _h("method:fingerprint-challenge-review-v0.1");
        bytes32 attestationHash = _h("attestation:fresh-nonce-satisfied");
        _approveVerifierScope(tradeId, verifier, scopeSetHash);
        bytes32 attestationBinding =
            escrow.verifierAttestationBindingHash(tradeId, attestationHash, challengeHash, scopeSetHash, methodIdHash);
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId, attestationHash, challengeHash, scopeSetHash, methodIdHash, _sig(verifierKey, attestationBinding)
        );

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:verifier-satisfied");
        bytes32 resolutionBinding =
            escrow.fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, attestationHash);
        vm.prank(buyer);
        escrow.clearFingerprintChallengeWithAttestation(
            tradeId, resolutionHash, attestationHash, _sig(buyerKey, resolutionBinding)
        );

        bytes32 routeHash = _h("route:after-verifier-cure");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        _assertState(tradeId, MarketplaceEscrow.State.RouteLocked);
    }

    function testFingerprintChallengeAttestationClearRequiresExistingAttestation() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:missing-attestation"));
        _commitInventoryLock(tradeId, _h("inventory:missing-attestation"));

        bytes32 challengeHash = _h("fingerprint-challenge:missing-attestation");
        vm.prank(buyer);
        escrow.openFingerprintChallenge(
            tradeId, challengeHash, _challengeResolutionScope(), _sig(buyerKey, challengeHash)
        );

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:missing-attestation");
        bytes32 missingAttestationHash = _h("attestation:not-committed");
        bytes32 resolutionBinding =
            escrow.fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, missingAttestationHash);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.ChallengeAttestationMissing.selector, missingAttestationHash)
        );
        vm.prank(buyer);
        escrow.clearFingerprintChallengeWithAttestation(
            tradeId, resolutionHash, missingAttestationHash, _sig(buyerKey, resolutionBinding)
        );
    }

    function testFingerprintChallengeAttestationMustTargetActiveChallenge() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        bytes32 itemFingerprintHash = _h("fingerprint:wrong-attestation-subject");
        _commitItemFingerprint(tradeId, itemFingerprintHash);
        _commitInventoryLock(tradeId, _h("inventory:wrong-attestation-subject"));

        bytes32 challengeHash = _h("fingerprint-challenge:wrong-attestation-subject");
        bytes32 scopeSetHash = _challengeResolutionScope();
        vm.prank(buyer);
        escrow.openFingerprintChallenge(tradeId, challengeHash, scopeSetHash, _sig(buyerKey, challengeHash));

        bytes32 methodIdHash = _h("method:fingerprint-challenge-review-v0.1");
        bytes32 attestationHash = _h("attestation:wrong-subject");
        _approveVerifierScope(tradeId, verifier, scopeSetHash);
        bytes32 attestationBinding = escrow.verifierAttestationBindingHash(
            tradeId, attestationHash, itemFingerprintHash, scopeSetHash, methodIdHash
        );
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId,
            attestationHash,
            itemFingerprintHash,
            scopeSetHash,
            methodIdHash,
            _sig(verifierKey, attestationBinding)
        );

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:wrong-subject");
        bytes32 resolutionBinding =
            escrow.fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, attestationHash);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.ChallengeAttestationSubjectMismatch.selector, challengeHash, itemFingerprintHash
            )
        );
        vm.prank(buyer);
        escrow.clearFingerprintChallengeWithAttestation(
            tradeId, resolutionHash, attestationHash, _sig(buyerKey, resolutionBinding)
        );
    }

    function testFingerprintChallengeAttestationClearRejectsOldUnboundSignature() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.2 ether, 0.02 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:old-clear-signature"));
        _commitInventoryLock(tradeId, _h("inventory:old-clear-signature"));

        bytes32 challengeHash = _h("fingerprint-challenge:old-clear-signature");
        bytes32 scopeSetHash = _challengeResolutionScope();
        vm.prank(buyer);
        escrow.openFingerprintChallenge(tradeId, challengeHash, scopeSetHash, _sig(buyerKey, challengeHash));

        bytes32 methodIdHash = _h("method:fingerprint-challenge-review-v0.1");
        bytes32 attestationHash = _h("attestation:old-clear-signature");
        _approveVerifierScope(tradeId, verifier, scopeSetHash);
        bytes32 attestationBinding =
            escrow.verifierAttestationBindingHash(tradeId, attestationHash, challengeHash, scopeSetHash, methodIdHash);
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId, attestationHash, challengeHash, scopeSetHash, methodIdHash, _sig(verifierKey, attestationBinding)
        );

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:old-signature");
        bytes32 resolutionBinding =
            escrow.fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, attestationHash);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, buyer, resolutionBinding));
        vm.prank(buyer);
        escrow.clearFingerprintChallengeWithAttestation(
            tradeId, resolutionHash, attestationHash, _sig(buyerKey, resolutionHash)
        );
    }

    function testFraudSellerCannotOpenInspectionWithWrongDeliverySignature() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:fraud-false-delivery");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:false-claim");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, spendabilityHash);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, seller, deliveryHash));
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(buyerKey, deliveryHash)
        );
    }

    function testOldDeliveryAbiRequiresSpendability() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:old-delivery-abi");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:old-abi");
        vm.expectRevert(MarketplaceEscrow.SpendabilityRequired.selector);
        vm.prank(seller);
        escrow.markDelivered(tradeId, deliveryHash, _sig(sellerKey, deliveryHash));
    }

    function testOldDeliverySpendabilityAbiRequiresWitness() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:old-delivery-spendability-abi");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:old-spendability-abi");
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash);
        vm.expectRevert(MarketplaceEscrow.DeliveryWitnessRequired.selector);
        vm.prank(seller);
        escrow.markDelivered(tradeId, deliveryHash, spendabilityHash, _sig(sellerKey, deliveryHash));
    }

    function testDeliveryRequiresTypedWitness() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:delivery-typed-witness");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:missing-witness");
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash);
        vm.expectRevert(MarketplaceEscrow.DeliveryWitnessRequired.selector);
        vm.prank(seller);
        escrow.markDelivered(tradeId, deliveryHash, spendabilityHash, _sig(sellerKey, deliveryHash));
    }

    function testDeliveryRejectsWrongTypedWitness() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:delivery-wrong-witness");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:wrong-witness");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 wrongWitnessHash = _deliveryWitness(tradeId, _h("delivery:other"), spendabilityHash);
        bytes memory expected = abi.encodeWithSelector(
            MarketplaceEscrow.DeliveryWitnessMismatch.selector,
            _deliveryWitness(tradeId, deliveryHash, spendabilityHash),
            wrongWitnessHash
        );
        vm.expectRevert(expected);
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            wrongWitnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );
    }

    function testDeliverySpendabilityConsumed() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:delivery-spendability-consumed");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:spendability-consumed");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, spendabilityHash);
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );

        _assertTrue(escrow.consumedSpendabilityHashes(tradeId, spendabilityHash), "delivery spendability consumed");
    }

    function testAuditDeliveryRejectsOpaqueSpendabilityDigest() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:audit-delivery-opaque-spendability");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:audit-opaque-spendability");
        bytes32 opaqueSpendabilityHash = _h("opaque-delivery-spendability");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        bytes32 expectedSpendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, opaqueSpendabilityHash);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.SpendabilityDigestMismatch.selector, expectedSpendabilityHash, opaqueSpendabilityHash
            )
        );
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            opaqueSpendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );
    }

    function testAuditRouteRejectsCrossTradeAssemblyWitness() public {
        bytes32 sharedRouteHash = _h("route:audit-cross-trade-witness");
        uint256 firstTradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 firstSpendabilityHash = _routeSpendability(firstTradeId, sharedRouteHash);
        bytes32 firstWallBundleHash = _routeWallBundleRoot(firstTradeId, sharedRouteHash);
        bytes32 firstAssemblyHistoryHash = _routeAssemblyHistory(firstTradeId, sharedRouteHash);
        bytes32 firstWitnessHash = _routeAssemblyWitness(
            firstTradeId, sharedRouteHash, firstSpendabilityHash, firstWallBundleHash, firstAssemblyHistoryHash
        );

        uint256 secondTradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        MarketplaceEscrow.TypedSpendability memory secondTypedSpendability =
            _typedSpendability(secondTradeId, seller);
        bytes32 secondWallBundleHash = _routeWallBundleRoot(secondTradeId, sharedRouteHash);
        bytes32 secondAssemblyHistoryHash = _routeAssemblyHistory(secondTradeId, sharedRouteHash);
        bytes32 secondSpendabilityHash = _routeSpendability(
            secondTradeId, sharedRouteHash, secondWallBundleHash, secondAssemblyHistoryHash, secondTypedSpendability
        );
        bytes32 expectedWitnessHash = _routeAssemblyWitness(
            secondTradeId, sharedRouteHash, secondSpendabilityHash, secondWallBundleHash, secondAssemblyHistoryHash
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.RouteAssemblyWitnessMismatch.selector, expectedWitnessHash, firstWitnessHash
            )
        );
        vm.prank(seller);
        escrow.commitRoute(
            secondTradeId,
            sharedRouteHash,
            secondSpendabilityHash,
            secondWallBundleHash,
            secondAssemblyHistoryHash,
            firstWitnessHash,
            false,
            true,
            1 ether,
            secondTypedSpendability,
            _sig(sellerKey, sharedRouteHash)
        );
    }

    function testAuditSameTradeSpendabilityCannotMoveAcrossGates() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:audit-same-trade-spendability-replay");
        bytes32 routeSpendabilityHash = _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:audit-replay-route-spendability");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        bytes32 deliveryWitnessHash = _deliveryWitness(tradeId, deliveryHash, routeSpendabilityHash);
        bytes32 expectedDeliverySpendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.SpendabilityDigestMismatch.selector,
                expectedDeliverySpendabilityHash,
                routeSpendabilityHash
            )
        );
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            routeSpendabilityHash,
            deliveryWitnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );
    }

    function testAuditCrossTradeSpendabilityDependsOnTradeBoundDigest() public {
        bytes32 firstRouteHash = _h("route:audit-cross-trade-spendability:first");
        uint256 firstTradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 firstSpendabilityHash = _routeSpendability(firstTradeId, firstRouteHash);

        bytes32 secondRouteHash = _h("route:audit-cross-trade-spendability:second");
        uint256 secondTradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 secondWallBundleHash = _routeWallBundleRoot(secondTradeId, secondRouteHash);
        bytes32 secondAssemblyHistoryHash = _routeAssemblyHistory(secondTradeId, secondRouteHash);
        MarketplaceEscrow.TypedSpendability memory secondTypedSpendability =
            _typedSpendability(secondTradeId, seller);
        bytes32 expectedSecondSpendabilityHash = _routeSpendability(
            secondTradeId, secondRouteHash, secondWallBundleHash, secondAssemblyHistoryHash, secondTypedSpendability
        );
        bytes32 secondWitnessHash = _routeAssemblyWitness(
            secondTradeId, secondRouteHash, firstSpendabilityHash, secondWallBundleHash, secondAssemblyHistoryHash
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.SpendabilityDigestMismatch.selector,
                expectedSecondSpendabilityHash,
                firstSpendabilityHash
            )
        );
        vm.prank(seller);
        escrow.commitRoute(
            secondTradeId,
            secondRouteHash,
            firstSpendabilityHash,
            secondWallBundleHash,
            secondAssemblyHistoryHash,
            secondWitnessHash,
            false,
            true,
            1 ether,
            secondTypedSpendability,
            _sig(sellerKey, secondRouteHash)
        );
    }

    function testRouteClaimBeforeTimeoutIsRejected() public {
        uint256 tradeId = _createAndBond(1 ether, 0.2 ether, 0.02 ether);

        bytes32 routeHash = _h("route:nonship-too-early");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        uint256 availableAt = block.timestamp + escrow.ROUTE_CLAIM_TIMEOUT();

        bytes32 claimHash = _h("claim:nonship-too-early");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.RouteClaimTimeoutOpen.selector, availableAt));
        vm.prank(buyer);
        escrow.openRouteClaimAfterTimeout{value: 0.02 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
    }

    function testBuyerCanOpenRouteClaimAfterSellerNonshipTimeout() public {
        uint256 tradeId = _createAndBond(1 ether, 0.3 ether, 0.02 ether);

        bytes32 routeHash = _h("route:nonship-timeout");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        vm.prank(seller);
        escrow.markRouteInProgress(tradeId);
        vm.warp(block.timestamp + escrow.ROUTE_CLAIM_TIMEOUT() + 1);

        uint256 buyerBefore = buyer.balance;
        uint256 sellerBefore = seller.balance;

        bytes32 claimHash = _h("claim:nonship-timeout");
        vm.prank(buyer);
        escrow.openRouteClaimAfterTimeout{value: 0.02 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _assertState(tradeId, MarketplaceEscrow.State.ClaimOrDisputePending);

        bytes32 rulingHash = _h("ruling:nonship-refund-plus-bond");
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 10_000, 10_000, true, _sig(arbiterKey, rulingHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 1.3 ether, "buyer recovers escrow plus bond");
        _assertEq(seller.balance - sellerBefore, 0, "fraud seller receives nothing");
        _assertEq(address(escrow).balance, 0, "contract fully drained");
    }

    function testUnderfundedSellerBondIsRejected() public {
        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.prank(buyer);
        uint256 tradeId = escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
        committedAlphaPolicySnapshots[tradeId] = escrow.alphaAdmissionPolicyHash(tradeId, alphaPolicy);

        vm.expectRevert(MarketplaceEscrow.WrongBondAmount.selector);
        vm.prank(seller);
        escrow.acceptAndBond{value: 0.099 ether}(tradeId);
    }

    function testUnregisteredArbiterCannotBeSelected() public {
        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, stranger);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredArbiter.selector, stranger));
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            stranger,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, stranger),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testUnregisteredBuyerCannotCreateTrade() public {
        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredActor.selector, stranger));
        vm.prank(stranger);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testRevokedArbiterCannotBeSelected() public {
        registry.revokeArbiter(arbiter);

        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredArbiter.selector, arbiter));
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testUnregisteredSellerCannotBeSelected() public {
        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredActor.selector, stranger));
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            stranger,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testRevokedSellerCannotBeSelected() public {
        registry.revokeActor(seller);

        bytes32 intentHash = _h("intent");
        bytes32 termsHash = _h("terms");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredActor.selector, seller));
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testOnlyRegistryOwnerCanRegisterActors() public {
        vm.expectRevert(MarketplaceActorRegistry.Unauthorized.selector);
        vm.prank(stranger);
        registry.registerActor(stranger, MarketplaceActorRegistry.Role.Seller, _h("rogue-seller"));
    }

    function testOnlyRegistryOwnerCanRevokeAuthorities() public {
        vm.expectRevert(MarketplaceActorRegistry.Unauthorized.selector);
        vm.prank(stranger);
        registry.revokeArbiter(arbiter);
    }

    function testActorRegistryVerifiesPacketSignature() public {
        uint256 signerKey = 0xA11CE;
        address signer = vm.addr(signerKey);
        registry.registerActor(signer, MarketplaceActorRegistry.Role.Buyer, _h("signing-buyer"));

        bytes32 payloadHash = _h("signed-packet");
        bytes32 digest = registry.toEthSignedMessageHash(payloadHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        _assertTrue(
            registry.verifyActorSignature(signer, payloadHash, signature), "signature recovers registered actor"
        );
        _assertTrue(
            !registry.verifyActorSignature(seller, payloadHash, signature),
            "signature cannot be replayed as another actor"
        );
    }

    function testRevokedActorSignatureNoLongerVerifies() public {
        uint256 signerKey = 0xBEEF;
        address signer = vm.addr(signerKey);
        registry.registerActor(signer, MarketplaceActorRegistry.Role.Seller, _h("signing-seller"));

        bytes32 payloadHash = _h("signed-before-revocation");
        bytes32 digest = registry.toEthSignedMessageHash(payloadHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        _assertTrue(
            registry.verifyActorSignature(signer, payloadHash, signature), "signature verifies before revocation"
        );

        registry.revokeActor(signer);

        _assertTrue(!registry.verifyActorSignature(signer, payloadHash, signature), "signature fails after revocation");
    }

    function testTamperedPayloadHashDoesNotVerify() public {
        uint256 signerKey = 0xCAFE;
        address signer = vm.addr(signerKey);
        registry.registerActor(signer, MarketplaceActorRegistry.Role.Buyer, _h("signing-buyer"));

        bytes32 originalPayloadHash = _h("original-packet");
        bytes32 tamperedPayloadHash = _h("tampered-packet");
        bytes32 digest = registry.toEthSignedMessageHash(originalPayloadHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        _assertTrue(
            !registry.verifyActorSignature(signer, tamperedPayloadHash, signature),
            "signature cannot be moved to tampered payload"
        );
    }

    function testProofsCannotBeAddedAfterSettlement() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:insured");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        _markDeliveredBySeller(tradeId, "delivery:settled-proof-closed");
        bytes32 receiptHash = _h("receipt:done");
        vm.prank(buyer);
        escrow.buyerAccept(tradeId, receiptHash, _sig(buyerKey, receiptHash));

        vm.expectRevert(MarketplaceEscrow.ClosedTrade.selector);
        bytes32 lateProofHash = _h("late-proof");
        vm.prank(seller);
        escrow.attachProof(tradeId, lateProofHash, _sig(sellerKey, lateProofHash));
    }

    function testStrangerCannotAttachEvidence() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        bytes32 fakeProofHash = _h("fake-proof");
        vm.prank(stranger);
        escrow.attachEvidence(
            tradeId, MarketplaceEscrow.EvidenceKind.Trust, fakeProofHash, _sig(sellerKey, fakeProofHash)
        );
    }

    function testVerifierCannotAttachLooseEvidence() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        bytes32 verifierNoteHash = _h("verifier-note");
        vm.prank(verifier);
        escrow.attachEvidence(
            tradeId, MarketplaceEscrow.EvidenceKind.Item, verifierNoteHash, _sig(verifierKey, verifierNoteHash)
        );
    }

    function testApprovedVerifierStillCannotAttachLooseEvidence() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        _approveFingerprintVerifier(tradeId, verifier);

        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        bytes32 verifierNoteHash = _h("verifier-note");
        vm.prank(verifier);
        escrow.attachEvidence(
            tradeId, MarketplaceEscrow.EvidenceKind.Item, verifierNoteHash, _sig(verifierKey, verifierNoteHash)
        );
    }

    function testVerifierScopeApprovalRejectsOldUnscopedSignature() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 approvalHash = _h("old-unscoped-verifier-approval");
        bytes32 scopeSetHash = escrow.FINGERPRINT_SCOPE_SET_HASH();
        bytes32 scopedApprovalHash = escrow.verifierScopeApprovalHash(tradeId, verifier, scopeSetHash, approvalHash);

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, buyer, scopedApprovalHash));
        vm.prank(buyer);
        escrow.approveVerifierScope(tradeId, verifier, scopeSetHash, approvalHash, _sig(buyerKey, approvalHash));
    }

    function testVerifierCanCommitScopedAttestation() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 scopeSetHash = _h("scope:cert-custody");
        bytes32 methodIdHash = _h("method:tcg-slab-cert-custody-photo-v0.1");
        bytes32 subjectHash = committedItemFingerprints[tradeId];
        bytes32 attestationHash = _h("attestation:cert-custody");
        _approveVerifierScope(tradeId, verifier, scopeSetHash);

        bytes32 bindingHash =
            escrow.verifierAttestationBindingHash(tradeId, attestationHash, subjectHash, scopeSetHash, methodIdHash);
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId, attestationHash, subjectHash, scopeSetHash, methodIdHash, _sig(verifierKey, bindingHash)
        );

        _assertEq(
            uint256(escrow.verifierAttestationHashes(tradeId, 0)),
            uint256(attestationHash),
            "scoped attestation anchored"
        );
    }

    function testVerifierAttestationRequiresApprovedScope() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 scopeSetHash = _h("scope:unapproved");
        bytes32 methodIdHash = _h("method:tcg-slab-cert-custody-photo-v0.1");
        bytes32 subjectHash = committedItemFingerprints[tradeId];
        bytes32 attestationHash = _h("attestation:unapproved-scope");

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.UnapprovedVerifierScope.selector, verifier, scopeSetHash)
        );
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId, attestationHash, subjectHash, scopeSetHash, methodIdHash, _sig(verifierKey, attestationHash)
        );
    }

    function testVerifierAttestationRequiresAnchoredSubject() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 scopeSetHash = _h("scope:cert-custody-missing-subject");
        bytes32 methodIdHash = _h("method:tcg-slab-cert-custody-photo-v0.1");
        bytes32 missingSubjectHash = _h("subject:not-anchored");
        bytes32 attestationHash = _h("attestation:missing-subject");
        _approveVerifierScope(tradeId, verifier, scopeSetHash);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.AttestationSubjectMissing.selector, missingSubjectHash)
        );
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId, attestationHash, missingSubjectHash, scopeSetHash, methodIdHash, _sig(verifierKey, attestationHash)
        );
    }

    function testDuplicateProofHashIsRejected() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 proofHash = _h("seller-proof-once");
        vm.prank(seller);
        escrow.attachProof(tradeId, proofHash, _sig(sellerKey, proofHash));

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.DuplicatePacket.selector, proofHash));
        vm.prank(seller);
        escrow.attachProof(tradeId, proofHash, _sig(sellerKey, proofHash));
    }

    function testPacketHashCannotBeReusedAcrossProofAndEvidence() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 sharedHash = _h("same-packet-cannot-wear-two-hats");
        vm.prank(seller);
        escrow.attachProof(tradeId, sharedHash, _sig(sellerKey, sharedHash));

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.DuplicatePacket.selector, sharedHash));
        vm.prank(seller);
        escrow.attachEvidence(tradeId, MarketplaceEscrow.EvidenceKind.Item, sharedHash, _sig(sellerKey, sharedHash));
    }

    function testPredicateEvidenceAnchorsThroughRegisteredVerifierContract() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 predicateHash = _h("seller-private-threshold-predicate");
        predicateVerifier.setPredicateAccepted(predicateHash, true);

        vm.prank(seller);
        escrow.attachPredicateEvidence(
            tradeId,
            MarketplaceEscrow.EvidenceKind.PrivatePredicate,
            predicateHash,
            _sig(sellerKey, predicateHash),
            address(predicateVerifier),
            abi.encode(uint256(25)),
            hex"01"
        );

        _assertEq(uint256(escrow.evidenceHashes(tradeId, 0)), uint256(predicateHash), "predicate evidence is anchored");
    }

    function testPredicateEvidenceRequiresRegisteredVerifierContract() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        MarketplacePredicateVerifierStub unregisteredVerifier = new MarketplacePredicateVerifierStub();

        bytes32 predicateHash = _h("unregistered-predicate-verifier");
        unregisteredVerifier.setPredicateAccepted(predicateHash, true);

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.UnregisteredPredicateVerifier.selector, address(unregisteredVerifier)
            )
        );
        vm.prank(seller);
        escrow.attachPredicateEvidence(
            tradeId,
            MarketplaceEscrow.EvidenceKind.PrivatePredicate,
            predicateHash,
            _sig(sellerKey, predicateHash),
            address(unregisteredVerifier),
            abi.encode(uint256(25)),
            hex"01"
        );
    }

    function testPredicateEvidenceRequiresPassingVerifierContract() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 predicateHash = _h("predicate-not-accepted");

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.PredicateVerificationFailed.selector, address(predicateVerifier), predicateHash
            )
        );
        vm.prank(seller);
        escrow.attachPredicateEvidence(
            tradeId,
            MarketplaceEscrow.EvidenceKind.PrivatePredicate,
            predicateHash,
            _sig(sellerKey, predicateHash),
            address(predicateVerifier),
            abi.encode(uint256(25)),
            hex"01"
        );
    }

    function testRevokedVerifierCannotAttachEvidence() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeVerifier(verifier);

        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        bytes32 staleVerifierHash = _h("stale-verifier");
        vm.prank(verifier);
        escrow.attachEvidence(
            tradeId, MarketplaceEscrow.EvidenceKind.Item, staleVerifierHash, _sig(verifierKey, staleVerifierHash)
        );
    }

    function testClaimAfterInspectionWindowIsRejected() public {
        uint256 tradeId = _deliverTrade(1 ether, 0.1 ether, 0.01 ether);

        vm.warp(block.timestamp + 3 days);

        vm.expectRevert(MarketplaceEscrow.InspectionWindowClosed.selector);
        bytes32 lateClaimHash = _h("late-claim");
        vm.prank(buyer);
        escrow.openClaim{value: 0.01 ether}(tradeId, lateClaimHash, _sig(buyerKey, lateClaimHash));
    }

    function testAutoSettlementBlockedWhileClaimPending() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        vm.warp(block.timestamp + 3 days);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.BadState.selector, MarketplaceEscrow.State.ClaimOrDisputePending)
        );
        escrow.settleAfterInspection(tradeId);
    }

    function testNonArbiterCannotResolveClaim() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        bytes32 sellerRulingHash = _h("seller-ruling");
        vm.prank(seller);
        escrow.resolveClaim(tradeId, sellerRulingHash, 0, 0, false, _sig(sellerKey, sellerRulingHash));
    }

    function testRevokedArbiterCannotResolveExistingClaim() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredArbiter.selector, arbiter));
        bytes32 rulingHash = _h("revoked-arbiter-ruling");
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 5_000, true, _sig(arbiterKey, rulingHash));
    }

    function testBuyerSellerCanReplaceRevokedArbiterAndResolveClaim() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 proposalHash = _h("arbiter-replacement:agree");
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(buyerKey, proposalHash));
        vm.prank(seller);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(sellerKey, proposalHash));

        bytes32 rulingHash = _h("replacement-ruling");
        vm.prank(replacementArbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 2_500, true, _sig(replacementArbiterKey, rulingHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
    }

    function testSinglePartyCannotReplaceArbiter() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 proposalHash = _h("arbiter-replacement:buyer-only");
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(buyerKey, proposalHash));

        bytes32 rulingHash = _h("premature-replacement-ruling");
        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        vm.prank(replacementArbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 2_500, true, _sig(replacementArbiterKey, rulingHash));
    }

    function testEmergencyReplacementAfterTimeoutWhenCurrentArbiterRevoked() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 proposalHash = _h("arbiter-replacement:emergency");
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(buyerKey, proposalHash));

        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + 1);
        vm.prank(replacementArbiter);
        escrow.emergencyReplaceArbiter(tradeId, proposalHash, _sig(replacementArbiterKey, proposalHash));

        bytes32 rulingHash = _h("emergency-replacement-ruling");
        vm.prank(replacementArbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 2_500, true, _sig(replacementArbiterKey, rulingHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
    }

    function testEmergencyReplacementRequiresTimeout() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 proposalHash = _h("arbiter-replacement:too-early");
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(buyerKey, proposalHash));

        uint256 availableAt = block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT();
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.ReplacementTimeoutOpen.selector, availableAt));
        vm.prank(replacementArbiter);
        escrow.emergencyReplaceArbiter(tradeId, proposalHash, _sig(replacementArbiterKey, proposalHash));
    }

    function testEmergencyReplacementRequiresInactiveCurrentArbiter() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        bytes32 proposalHash = _h("arbiter-replacement:active-old-arbiter");
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(buyerKey, proposalHash));

        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + 1);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.ArbiterStillActive.selector, arbiter));
        vm.prank(replacementArbiter);
        escrow.emergencyReplaceArbiter(tradeId, proposalHash, _sig(replacementArbiterKey, proposalHash));
    }

    function testEmergencyReplacementRequiresReplacementArbiterSignature() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 proposalHash = _h("arbiter-replacement:bad-acceptance-signature");
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(buyerKey, proposalHash));

        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + 1);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, replacementArbiter, proposalHash)
        );
        vm.prank(replacementArbiter);
        escrow.emergencyReplaceArbiter(tradeId, proposalHash, _sig(buyerKey, proposalHash));
    }

    function testArbiterReplacementRequiresActiveArbiter() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        bytes32 proposalHash = _h("arbiter-replacement:bad");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredArbiter.selector, stranger));
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, stranger, proposalHash, _sig(buyerKey, proposalHash));
    }

    function testArbiterReplacementRequiresApproverSignature() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        bytes32 proposalHash = _h("arbiter-replacement:wrong-signature");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, buyer, proposalHash));
        vm.prank(buyer);
        escrow.approveArbiterReplacement(tradeId, replacementArbiter, proposalHash, _sig(sellerKey, proposalHash));
    }

    function testAuditD6TradeCreationRequiresJudgmentSupplyCommitment() public {
        bytes32 intentHash = _h("intent:audit-d6-missing-jsc");
        bytes32 termsHash = _h("terms:audit-d6-missing-jsc");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);

        vm.expectRevert(MarketplaceEscrow.JudgmentSupplyRequired.selector);
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            bytes32(0),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testAuditD6TradeWithJudgmentSupplyCanRouteSettleAndResolve() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        uint256 buyerBefore = buyer.balance;
        bytes32 rulingHash = _h("ruling:audit-d6-no-policy-or-remedy-cap");
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 7_500, 3_000, true, _sig(arbiterKey, rulingHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 0.79 ether, "JSC-bound ruling moved funds");
    }

    function testG3VerifierSettlementRequiresCommittedJscRoute() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        bytes32 rulingHash = _h("ruling:g3-missing-jsc-route");
        bytes memory verifierSignature = _verifierRulingSignature(tradeId, rulingHash, bytes32(0), 5_000, 0, true);
        vm.expectRevert(MarketplaceEscrow.JscVerifierRouteRequired.selector);
        escrow.resolveClaimWithVerifierRuling(tradeId, rulingHash, bytes32(0), 5_000, 0, true, verifierSignature);
    }

    function testG3PrivateAdvisorRouteCannotCreateSellerLiability() public {
        MarketplaceEscrow.JscVerifierRoute memory route = _privateAdvisorRoute();
        (uint256 tradeId,) = _openClaimWithVerifierRoute(route);

        bytes32 rulingHash = _h("ruling:g3-advisor-cannot-settle");
        bytes memory verifierSignature = _verifierRulingSignature(tradeId, rulingHash, route.scopeHash, 5_000, 0, true);
        vm.expectRevert(MarketplaceEscrow.VerifierSettlementNotAuthorized.selector);
        escrow.resolveClaimWithVerifierRuling(tradeId, rulingHash, route.scopeHash, 5_000, 0, true, verifierSignature);
    }

    function testG3VerifierRouteRequiresExplicitSellerAcceptance() public {
        uint256 tradeId = _createPendingTrade(1 ether, 0.1 ether, 0.01 ether);
        MarketplaceEscrow.JscVerifierRoute memory route = _settlementVerifierRoute(0.01 ether);
        bytes32 routeHash = _commitVerifierRoute(tradeId, route);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.BadState.selector, MarketplaceEscrow.State.EscrowFunded)
        );
        vm.prank(verifier);
        escrow.lockVerifierSettlementBond{value: route.verifierBondRequired}(tradeId, routeHash);

        vm.expectRevert(MarketplaceEscrow.JscVerifierRouteAcceptanceRequired.selector);
        vm.prank(seller);
        escrow.acceptAndBond{value: 0.1 ether}(tradeId);

        bytes32 wrongRouteHash = _h("jsc-route:g3-front-run-wrong-route");
        bytes memory wrongAcceptanceSignature = _jscRouteAcceptanceSignature(tradeId, wrongRouteHash);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.JscVerifierRouteMismatch.selector, routeHash, wrongRouteHash)
        );
        vm.prank(seller);
        escrow.acceptAndBondWithJscVerifierRoute{value: 0.1 ether}(tradeId, wrongRouteHash, wrongAcceptanceSignature);

        bytes memory routeAcceptanceSignature = _jscRouteAcceptanceSignature(tradeId, routeHash);
        vm.prank(seller);
        escrow.acceptAndBondWithJscVerifierRoute{value: 0.1 ether}(tradeId, routeHash, routeAcceptanceSignature);

        _assertState(tradeId, MarketplaceEscrow.State.EvidencePending);
    }

    function testG3SettlementVerifierRequiresAcceptedScopeAndLockedBond() public {
        MarketplaceEscrow.JscVerifierRoute memory route = _settlementVerifierRoute(0.01 ether);
        (uint256 tradeId, bytes32 routeHash) = _openClaimWithVerifierRoute(route);

        bytes32 wrongRouteHash = _h("jsc-route:g3-wrong-route");
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.JscVerifierRouteMismatch.selector, routeHash, wrongRouteHash)
        );
        vm.prank(verifier);
        escrow.lockVerifierSettlementBond{value: route.verifierBondRequired}(tradeId, wrongRouteHash);

        bytes32 rulingHash = _h("ruling:g3-bond-required");
        bytes32 wrongScopeHash = _h("scope:g3-wrong");
        bytes memory wrongScopeSignature = _verifierRulingSignature(tradeId, rulingHash, wrongScopeHash, 5_000, 0, true);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.JscScopeMismatch.selector, route.scopeHash, wrongScopeHash)
        );
        escrow.resolveClaimWithVerifierRuling(tradeId, rulingHash, wrongScopeHash, 5_000, 0, true, wrongScopeSignature);

        bytes memory verifierSignature = _verifierRulingSignature(tradeId, rulingHash, route.scopeHash, 5_000, 0, true);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.VerifierBondRequired.selector, route.verifierBondRequired, 0)
        );
        escrow.resolveClaimWithVerifierRuling(tradeId, rulingHash, route.scopeHash, 5_000, 0, true, verifierSignature);
    }

    function testG3SettlementVerifierCanResolveOnlyThroughAcceptedJscRuling() public {
        MarketplaceEscrow.JscVerifierRoute memory route = _settlementVerifierRoute(0.01 ether);
        (uint256 tradeId, bytes32 routeHash) = _openClaimWithVerifierRoute(route);

        vm.prank(verifier);
        escrow.lockVerifierSettlementBond{value: route.verifierBondRequired}(tradeId, routeHash);

        bytes32 rulingHash = _h("ruling:g3-accepted-verifier-settlement");
        bytes32 rulingBinding =
            escrow.verifierSettlementRulingHash(tradeId, rulingHash, route.scopeHash, 5_000, 0, true);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, verifier, rulingBinding));
        escrow.resolveClaimWithVerifierRuling(
            tradeId, rulingHash, route.scopeHash, 5_000, 0, true, _sig(sellerKey, rulingBinding)
        );

        uint256 buyerBefore = buyer.balance;
        escrow.resolveClaimWithVerifierRuling(
            tradeId,
            rulingHash,
            route.scopeHash,
            5_000,
            0,
            true,
            _verifierRulingSignature(tradeId, rulingHash, route.scopeHash, 5_000, 0, true)
        );

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 0.51 ether, "verifier ruling moves bounded funds");
        _assertEq(address(escrow).balance, route.verifierBondRequired, "verifier bond tail held");

        uint256 releaseAt = block.timestamp + route.verifierBondTailSeconds;
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.VerifierBondReleasePending.selector, releaseAt));
        vm.prank(verifier);
        escrow.withdrawVerifierSettlementBond(tradeId);

        uint256 verifierBefore = verifier.balance;
        vm.warp(releaseAt + 1);
        vm.prank(verifier);
        escrow.withdrawVerifierSettlementBond(tradeId);

        _assertEq(verifier.balance - verifierBefore, route.verifierBondRequired, "verifier bond releases after tail");
    }

    function testAuditD6RulingPayoutBoundsRejectOverCap() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        bytes32 overRefundRulingHash = _h("ruling:audit-d6-over-refund-cap");
        vm.expectRevert(MarketplaceEscrow.BadAmount.selector);
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, overRefundRulingHash, 10_001, 0, true, _sig(arbiterKey, overRefundRulingHash));

        bytes32 overPenaltyRulingHash = _h("ruling:audit-d6-over-penalty-cap");
        vm.expectRevert(MarketplaceEscrow.BadAmount.selector);
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, overPenaltyRulingHash, 0, 10_001, true, _sig(arbiterKey, overPenaltyRulingHash));
    }

    function testAuditD6RevokedArbiterMidClaimCanReachFloorRulingWithoutProposal() public {
        uint256 tradeId = _openClaimWithFloorJudgmentRoute(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 rulingHash = _h("ruling:audit-d6-revoked-arbiter-mid-claim");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredArbiter.selector, arbiter));
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 5_000, true, _sig(arbiterKey, rulingHash));

        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + _floorAppealWindow() + 1);

        uint256 buyerBefore = buyer.balance;
        bytes32 floorRulingHash = _h("floor-ruling:audit-d6-revoked-arbiter-mid-claim");
        bytes32 floorRulingBinding = escrow.floorRulingHash(tradeId, floorRulingHash, 5_000, 5_000, true);
        (address[] memory panelSigners, bytes[] memory panelSignatures) = _floorPanelAttestations(floorRulingBinding);
        vm.prank(buyer);
        escrow.resolveClaimViaFloor(
            tradeId,
            floorRulingHash,
            5_000,
            5_000,
            true,
            _floorRulingSignature(tradeId, floorRulingHash, 5_000, 5_000, true),
            panelSigners,
            panelSignatures
        );

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 0.56 ether, "floor ruling moved funds");
    }

    function testAuditD6RevokedArbiterMidRouteClaimCanReachFloorRuling() public {
        uint256 tradeId = _createAndBondWithFloorJudgmentRoute(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:audit-d6-revoked-arbiter-mid-route");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        registry.revokeArbiter(arbiter);

        vm.warp(block.timestamp + escrow.ROUTE_CLAIM_TIMEOUT() + 1);
        bytes32 claimHash = _h("claim:audit-d6-route-timeout-revoked-arbiter");
        vm.prank(buyer);
        escrow.openRouteClaimAfterTimeout{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));

        bytes32 rulingHash = _h("ruling:audit-d6-route-timeout-revoked-arbiter");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.UnregisteredArbiter.selector, arbiter));
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 10_000, 10_000, true, _sig(arbiterKey, rulingHash));

        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + _floorAppealWindow() + 1);

        uint256 buyerBefore = buyer.balance;
        bytes32 floorRulingHash = _h("floor-ruling:audit-d6-route-timeout-revoked-arbiter");
        bytes32 floorRulingBinding = escrow.floorRulingHash(tradeId, floorRulingHash, 10_000, 10_000, true);
        (address[] memory panelSigners, bytes[] memory panelSignatures) = _floorPanelAttestations(floorRulingBinding);
        vm.prank(buyer);
        escrow.resolveClaimViaFloor(
            tradeId,
            floorRulingHash,
            10_000,
            10_000,
            true,
            _floorRulingSignature(tradeId, floorRulingHash, 10_000, 10_000, true),
            panelSigners,
            panelSignatures
        );

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 1.11 ether, "floor ruling refunds route claim");
    }

    function testAuditD6DefaultRemedyFiresOnlyAfterFloorWindowExpires() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 routeHash = _h("route:audit-d6-default-nonship");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        registry.revokeArbiter(arbiter);

        vm.warp(block.timestamp + escrow.ROUTE_CLAIM_TIMEOUT() + 1);
        bytes32 claimHash = _h("claim:audit-d6-default-nonship");
        vm.prank(buyer);
        escrow.openRouteClaimAfterTimeout{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));

        bytes32 defaultRulingHash = _h("default-ruling:audit-d6-floor-not-exercised");
        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + 1);
        uint256 defaultAvailableAt = block.timestamp + escrow.FLOOR_RESOLUTION_TIMEOUT() - 1;
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.FloorResolutionTimeoutOpen.selector, defaultAvailableAt)
        );
        escrow.resolveUnresolvableClaimByDefault(tradeId, defaultRulingHash);

        uint256 buyerBefore = buyer.balance;
        vm.warp(block.timestamp + escrow.FLOOR_RESOLUTION_TIMEOUT() + 1);
        escrow.resolveUnresolvableClaimByDefault(tradeId, defaultRulingHash);

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 1.01 ether, "stage-three default refunds escrow plus dispute bond");
    }

    function testAuditD6PostDeliveryDefaultRequiresFloorReceipt() public {
        uint256 tradeId = _openClaimWithFloorJudgmentRoute(1 ether, 0.1 ether, 0.01 ether);
        registry.revokeArbiter(arbiter);

        bytes32 defaultRulingHash = _h("default-ruling:audit-d6-post-delivery");
        vm.warp(
            block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + escrow.FLOOR_RESOLUTION_TIMEOUT()
                + _floorAppealWindow() + 1
        );

        vm.expectRevert(MarketplaceEscrow.PostDeliveryDefaultRequiresFloorReceipt.selector);
        escrow.resolveUnresolvableClaimByDefault(tradeId, defaultRulingHash);

        bytes32 receiptHash = _h("floor-receipt:audit-d6-post-delivery-unresolvable");
        bytes32 receiptBinding = escrow.unresolvableClaimReceiptHash(tradeId, defaultRulingHash, receiptHash);
        (address[] memory panelSigners, bytes[] memory panelSignatures) = _floorPanelAttestations(receiptBinding);
        uint256 buyerBefore = buyer.balance;
        escrow.resolvePostDeliveryUnresolvableClaimByFloorReceipt(
            tradeId,
            defaultRulingHash,
            receiptHash,
            _unresolvableClaimReceiptSignature(tradeId, defaultRulingHash, receiptHash),
            panelSigners,
            panelSignatures
        );

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
        _assertEq(buyer.balance - buyerBefore, 1.01 ether, "floor receipt gates post-delivery default refund");
    }

    function testAuditD6PostDeliveryDefaultRejectsForgedFloorReceipt() public {
        uint256 tradeId = _openClaimWithFloorJudgmentRoute(1 ether, 0.1 ether, 0.01 ether);

        bytes32 defaultRulingHash = _h("default-ruling:audit-d6-forged-receipt");
        bytes32 receiptHash = _h("floor-receipt:audit-d6-forged-receipt");
        bytes32 receiptBinding = escrow.unresolvableClaimReceiptHash(tradeId, defaultRulingHash, receiptHash);

        vm.warp(
            block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + escrow.FLOOR_RESOLUTION_TIMEOUT()
                + _floorAppealWindow() + 1
        );

        (address[] memory panelSigners, bytes[] memory panelSignatures) = _floorPanelAttestations(receiptBinding);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, replacementArbiter, receiptBinding)
        );
        escrow.resolvePostDeliveryUnresolvableClaimByFloorReceipt(
            tradeId, defaultRulingHash, receiptHash, _sig(arbiterKey, receiptBinding), panelSigners, panelSignatures
        );
    }

    function testG5FloorReceiptRequiresCommittedFloorJudgmentRoute() public {
        uint256 tradeId = _openClaim(1 ether, 0.1 ether, 0.01 ether);

        bytes32 defaultRulingHash = _h("default-ruling:g5-no-floor-route");
        bytes32 receiptHash = _h("floor-receipt:g5-no-floor-route");
        bytes32 receiptBinding = escrow.unresolvableClaimReceiptHash(tradeId, defaultRulingHash, receiptHash);
        (address[] memory panelSigners, bytes[] memory panelSignatures) = _floorPanelAttestations(receiptBinding);
        bytes memory floorSignature = _unresolvableClaimReceiptSignature(tradeId, defaultRulingHash, receiptHash);

        vm.warp(
            block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + escrow.FLOOR_RESOLUTION_TIMEOUT()
                + _floorAppealWindow() + 1
        );

        vm.expectRevert(MarketplaceEscrow.FloorJudgmentRouteRequired.selector);
        escrow.resolvePostDeliveryUnresolvableClaimByFloorReceipt(
            tradeId, defaultRulingHash, receiptHash, floorSignature, panelSigners, panelSignatures
        );
    }

    function testG5CreateTradeRejectsPartyFloorExecutor() public {
        bytes32 intentHash = _h("intent:g5-party-floor");
        bytes32 termsHash = _h("terms:g5-party-floor");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.JudgmentAuthorityConflict.selector, seller));
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            seller,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testA1CreateTradeRejectsOverEpochLossBudget() public {
        bytes32 intentHash = _h("intent:a1-over-epoch-budget");
        bytes32 termsHash = _h("terms:a1-over-epoch-budget");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        alphaPolicy.globalEpochLossAfter = alphaPolicy.maxGlobalEpochLoss + 1;
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.AlphaAdmissionPolicyRejected.selector, alphaPolicy.policyHash)
        );
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testA1CreateTradeRejectsRotatedEpochId() public {
        bytes32 intentHash = _h("intent:a1-rotated-epoch");
        bytes32 termsHash = _h("terms:a1-rotated-epoch");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        alphaPolicy.epochId = escrow.currentAlphaEpochId() + 1;
        alphaPolicy.globalEpochLossAfter = escrow.alphaEpochExposure(alphaPolicy.epochId) + 1 ether;
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.AlphaAdmissionPolicyRejected.selector, alphaPolicy.policyHash)
        );
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testA1CreateTradeRequiresPolicyAuthoritySignature() public {
        bytes32 intentHash = _h("intent:a1-authority-signature");
        bytes32 termsHash = _h("terms:a1-authority-signature");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        bytes32 policySnapshotHash = escrow.alphaAdmissionPolicyHash(expectedTradeId, alphaPolicy);
        bytes memory buyerPolicySignature = _sig(buyerKey, policySnapshotHash);

        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.BadSignature.selector, alphaPolicy.policyAuthority, policySnapshotHash
            )
        );
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            buyerPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testA1CreateTradeRejectsStaleExposureAfterValue() public {
        _createPendingTrade(1 ether, 0.1 ether, 0.01 ether);

        bytes32 intentHash = _h("intent:a1-stale-exposure");
        bytes32 termsHash = _h("terms:a1-stale-exposure");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        alphaPolicy.principalExposureAfter = 1 ether;
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.AlphaAdmissionPolicyRejected.selector, alphaPolicy.policyHash)
        );
        vm.prank(buyer);
        escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
    }

    function testA1ExposureLedgerReleasesOnBuyerAcceptance() public {
        uint256 tradeId = _deliverTrade(1 ether, 0.1 ether, 0.01 ether);
        uint64 epochId = escrow.currentAlphaEpochId();

        _assertEq(escrow.alphaPrincipalExposure(buyer), 1 ether, "principal exposure reserved");
        _assertEq(escrow.alphaJudgmentAuthorityExposure(arbiter), 1 ether, "judgment exposure reserved");
        _assertEq(escrow.alphaEpochExposure(epochId), 1 ether, "epoch exposure reserved");

        bytes32 receiptHash = _h("receipt:a1-release-exposure");
        vm.prank(buyer);
        escrow.buyerAccept(tradeId, receiptHash, _sig(buyerKey, receiptHash));

        _assertEq(escrow.alphaPrincipalExposure(buyer), 0, "principal exposure released");
        _assertEq(escrow.alphaJudgmentAuthorityExposure(arbiter), 0, "judgment exposure released");
        _assertEq(escrow.alphaEpochExposure(epochId), 0, "epoch exposure released");
    }

    function testA1JscVerifierRouteReservesVerifierExposure() public {
        uint256 tradeId = _createPendingTrade(1 ether, 0.1 ether, 0.01 ether);
        MarketplaceEscrow.JscVerifierRoute memory route = _settlementVerifierRoute(0.01 ether);

        _commitVerifierRoute(tradeId, route);

        _assertEq(
            escrow.alphaVerifierExposure(verifier), route.verifierExposureCap, "verifier exposure reserved at JSC"
        );
    }

    function testA1JscVerifierRouteRejectsVerifierExposureOverPolicyCap() public {
        bytes32 intentHash = _h("intent:a1-verifier-over-cap");
        bytes32 termsHash = _h("terms:a1-verifier-over-cap");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, 1 ether, arbiter);
        alphaPolicy.maxVerifierExposure = 0.01 ether;
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);

        vm.prank(buyer);
        uint256 tradeId = escrow.createTrade{value: 1 ether}(
            seller,
            arbiter,
            0.1 ether,
            0.01 ether,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
        committedAlphaPolicySnapshots[tradeId] = escrow.alphaAdmissionPolicyHash(tradeId, alphaPolicy);

        MarketplaceEscrow.JscVerifierRoute memory route = _settlementVerifierRoute(0.01 ether);
        bytes32 routeHash = escrow.jscVerifierRouteHash(tradeId, route);
        bytes memory routeSignature = _sig(buyerKey, routeHash);
        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.AlphaAdmissionPolicyRejected.selector, alphaPolicy.policyHash)
        );
        vm.prank(buyer);
        escrow.commitJscVerifierRoute(tradeId, route, routeSignature);
    }

    function testA2DeliveryRejectsSellerSingletonWitness() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:a2-seller-singleton");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:a2-seller-singleton");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        deliveryPolicy.independentWitnessCount = 0;
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, spendabilityHash);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.DeliveryPolicyRejected.selector, deliveryPolicy.policyHash)
        );
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );
    }

    function testA2DeliveryRejectsExpiredChallengeWindow() public {
        vm.roll(10);
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:a2-expired-challenge-window");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);

        bytes32 deliveryHash = _h("delivery:a2-expired-challenge-window");
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        deliveryPolicy.challengeDeadlineBlock = uint64(block.number - 1);
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, spendabilityHash);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.DeliveryPolicyRejected.selector, deliveryPolicy.policyHash)
        );
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );
    }

    function testA3PostDeliveryBuyerRefundRequiresRemedyMatrix() public {
        uint256 tradeId = _deliverTrade(1 ether, 0.1 ether, 0.01 ether);

        bytes32 claimHash = _h("claim:a3-no-remedy-matrix");
        vm.prank(buyer);
        escrow.openClaim{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));

        bytes32 rulingHash = _h("ruling:a3-no-remedy-matrix");
        vm.expectRevert(MarketplaceEscrow.PostHandoffRemedyRequired.selector);
        vm.prank(arbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 0, true, _sig(arbiterKey, rulingHash));
    }

    function testA3SellerCannotCommitPostHandoffRemedyMatrix() public {
        uint256 tradeId = _deliverTrade(1 ether, 0.1 ether, 0.01 ether);

        bytes32 claimHash = _h("claim:a3-seller-remedy-matrix");
        vm.prank(buyer);
        escrow.openClaim{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));

        MarketplaceEscrow.PostHandoffRemedy memory remedy = MarketplaceEscrow.PostHandoffRemedy({
            claimTypeHash: _h("claim-type:a3-seller-matrix"),
            remedyTypeHash: _h("remedy:a3-seller-matrix"),
            maxAmount: 1 ether,
            returnRequired: true,
            returnCustodyHash: _h("return-custody:a3-seller-matrix"),
            evidenceRoot: _h("evidence-root:a3-seller-matrix"),
            appealFinalStateHash: escrow.APPEAL_FINAL_STATE_HASH(),
            nonReturnRemedyAllowed: false
        });
        bytes32 remedyHash = escrow.postHandoffRemedyHash(tradeId, remedy);

        vm.expectRevert(MarketplaceEscrow.Unauthorized.selector);
        vm.prank(seller);
        escrow.commitPostHandoffRemedy(tradeId, remedy, _sig(sellerKey, remedyHash));
    }

    function testA3PostHandoffRemedyMatrixCannotBeReplaced() public {
        uint256 tradeId = _deliverTrade(1 ether, 0.1 ether, 0.01 ether);

        bytes32 claimHash = _h("claim:a3-replace-remedy-matrix");
        vm.prank(buyer);
        escrow.openClaim{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
        bytes32 existingRemedyHash = _commitDefaultPostHandoffRemedy(tradeId, 1 ether);

        MarketplaceEscrow.PostHandoffRemedy memory replacement = MarketplaceEscrow.PostHandoffRemedy({
            claimTypeHash: _h("claim-type:a3-replacement-matrix"),
            remedyTypeHash: _h("remedy:a3-replacement-matrix"),
            maxAmount: 0.5 ether,
            returnRequired: true,
            returnCustodyHash: _h("return-custody:a3-replacement-matrix"),
            evidenceRoot: _h("evidence-root:a3-replacement-matrix"),
            appealFinalStateHash: escrow.APPEAL_FINAL_STATE_HASH(),
            nonReturnRemedyAllowed: false
        });
        bytes32 replacementHash = escrow.postHandoffRemedyHash(tradeId, replacement);

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.DuplicatePacket.selector, existingRemedyHash));
        vm.prank(buyer);
        escrow.commitPostHandoffRemedy(tradeId, replacement, _sig(buyerKey, replacementHash));
    }

    function testA4RouteRejectsModelOutputSpendabilitySource() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:a4-model-output");
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        bytes32 assemblyHistoryHash = _routeAssemblyHistory(tradeId, routeHash);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        typedSpendability.sourceBasisHash = escrow.MODEL_OUTPUT_SOURCE_BASIS_HASH();
        bytes32 spendabilityHash =
            _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 witnessHash =
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.TypedSpendabilityRejected.selector, spendabilityHash)
        );
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
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
    }

    function testA4RouteRejectsUnavailableSourceClaims() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:a4-source-claims-unavailable");
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        bytes32 assemblyHistoryHash = _routeAssemblyHistory(tradeId, routeHash);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        typedSpendability.sourceClaimsAvailabilityHash = bytes32(0);
        bytes32 spendabilityHash =
            _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 witnessHash =
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.TypedSpendabilityRejected.selector, spendabilityHash)
        );
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
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
    }

    function testA4RouteRejectsIssuerAsUndiscountedSourceAuthor() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);
        bytes32 routeHash = _h("route:a4-source-author");
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        bytes32 assemblyHistoryHash = _routeAssemblyHistory(tradeId, routeHash);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        typedSpendability.sourceClaimAuthor = seller;
        bytes32 spendabilityHash =
            _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 witnessHash =
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);

        vm.expectRevert(
            abi.encodeWithSelector(MarketplaceEscrow.TypedSpendabilityRejected.selector, spendabilityHash)
        );
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
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
    }

    function testG5FloorJudgmentRouteRejectsSoleOraclePanel() public {
        uint256 tradeId = _createPendingTrade(1 ether, 0.1 ether, 0.01 ether);

        address[] memory members = new address[](1);
        members[0] = replacementArbiter;
        MarketplaceEscrow.FloorJudgmentRoute memory route = MarketplaceEscrow.FloorJudgmentRoute({
            panelMembers: members,
            requiredSignatures: 1,
            appealWindowSeconds: _floorAppealWindow(),
            appealAuthorityHash: _h("appeal:g5-sole-oracle"),
            panelMetadataHash: _h("panel:g5-sole-oracle")
        });
        bytes32 routeHash = escrow.floorJudgmentRouteHash(tradeId, route);

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.FloorPanelQuorumRequired.selector, 2, 1));
        vm.prank(buyer);
        escrow.commitFloorJudgmentRoute(tradeId, route, _sig(buyerKey, routeHash));
    }

    function testG5FloorReceiptRequiresPanelQuorum() public {
        uint256 tradeId = _openClaimWithFloorJudgmentRoute(1 ether, 0.1 ether, 0.01 ether);

        bytes32 defaultRulingHash = _h("default-ruling:g5-quorum");
        bytes32 receiptHash = _h("floor-receipt:g5-quorum");
        address[] memory panelSigners = new address[](0);
        bytes[] memory panelSignatures = new bytes[](0);
        bytes memory floorSignature = _unresolvableClaimReceiptSignature(tradeId, defaultRulingHash, receiptHash);

        vm.warp(
            block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + escrow.FLOOR_RESOLUTION_TIMEOUT()
                + _floorAppealWindow() + 1
        );

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.FloorPanelQuorumRequired.selector, 2, 1));
        escrow.resolvePostDeliveryUnresolvableClaimByFloorReceipt(
            tradeId, defaultRulingHash, receiptHash, floorSignature, panelSigners, panelSignatures
        );
    }

    function testG5FloorReceiptWaitsForAppealWindowBeforeMovingValue() public {
        uint256 tradeId = _openClaimWithFloorJudgmentRoute(1 ether, 0.1 ether, 0.01 ether);

        bytes32 defaultRulingHash = _h("default-ruling:g5-appeal-window");
        bytes32 receiptHash = _h("floor-receipt:g5-appeal-window");
        bytes32 receiptBinding = escrow.unresolvableClaimReceiptHash(tradeId, defaultRulingHash, receiptHash);
        (address[] memory panelSigners, bytes[] memory panelSignatures) = _floorPanelAttestations(receiptBinding);
        bytes memory floorSignature = _unresolvableClaimReceiptSignature(tradeId, defaultRulingHash, receiptHash);

        vm.warp(block.timestamp + escrow.ARBITER_REPLACEMENT_TIMEOUT() + escrow.FLOOR_RESOLUTION_TIMEOUT() + 1);
        uint256 appealAvailableAt = block.timestamp + _floorAppealWindow() - 1;

        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.FloorAppealWindowOpen.selector, appealAvailableAt));
        escrow.resolvePostDeliveryUnresolvableClaimByFloorReceipt(
            tradeId, defaultRulingHash, receiptHash, floorSignature, panelSigners, panelSignatures
        );
    }

    function testAuditD6NarrowVerifierScopeCannotClearBroaderChallenge() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:audit-d6-narrow-scope"));
        _commitInventoryLock(tradeId, _h("inventory:audit-d6-narrow-scope"));

        bytes32 challengeHash = _h("fingerprint-challenge:audit-d6-authenticity-question");
        bytes32 requiredScopeSetHash = _h("scope:authenticity-resolution-required");
        vm.prank(buyer);
        escrow.openFingerprintChallenge(tradeId, challengeHash, requiredScopeSetHash, _sig(buyerKey, challengeHash));

        bytes32 scopeSetHash = _h("scope:checked-symbol-field-only-not-authenticity");
        bytes32 methodIdHash = _h("method:photo-symbol-field-only");
        bytes32 attestationHash = _h("attestation:audit-d6-narrow-scope");
        _approveVerifierScope(tradeId, verifier, scopeSetHash);

        bytes32 attestationBinding =
            escrow.verifierAttestationBindingHash(tradeId, attestationHash, challengeHash, scopeSetHash, methodIdHash);
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId, attestationHash, challengeHash, scopeSetHash, methodIdHash, _sig(verifierKey, attestationBinding)
        );

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:audit-d6-narrow-scope");
        bytes32 resolutionBinding =
            escrow.fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, attestationHash);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketplaceEscrow.ChallengeAttestationScopeMismatch.selector, requiredScopeSetHash, scopeSetHash
            )
        );
        vm.prank(buyer);
        escrow.clearFingerprintChallengeWithAttestation(
            tradeId, resolutionHash, attestationHash, _sig(buyerKey, resolutionBinding)
        );

        _assertState(tradeId, MarketplaceEscrow.State.EvidencePending);
    }

    function testAuditD6MatchingVerifierScopeCanClearChallenge() public {
        uint256 tradeId = _createAndBondWithoutInventoryLock(1 ether, 0.1 ether, 0.01 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:audit-d6-matching-scope"));
        _commitInventoryLock(tradeId, _h("inventory:audit-d6-matching-scope"));

        bytes32 challengeHash = _h("fingerprint-challenge:audit-d6-matching-scope");
        bytes32 requiredScopeSetHash = _h("scope:authenticity-resolution-required");
        vm.prank(buyer);
        escrow.openFingerprintChallenge(tradeId, challengeHash, requiredScopeSetHash, _sig(buyerKey, challengeHash));

        bytes32 methodIdHash = _h("method:authenticity-resolution");
        bytes32 attestationHash = _h("attestation:audit-d6-matching-scope");
        _approveVerifierScope(tradeId, verifier, requiredScopeSetHash);

        bytes32 attestationBinding = escrow.verifierAttestationBindingHash(
            tradeId, attestationHash, challengeHash, requiredScopeSetHash, methodIdHash
        );
        vm.prank(verifier);
        escrow.commitVerifierAttestation(
            tradeId,
            attestationHash,
            challengeHash,
            requiredScopeSetHash,
            methodIdHash,
            _sig(verifierKey, attestationBinding)
        );

        bytes32 resolutionHash = _h("fingerprint-challenge-clear:audit-d6-matching-scope");
        bytes32 resolutionBinding =
            escrow.fingerprintChallengeResolutionHash(tradeId, resolutionHash, challengeHash, attestationHash);
        vm.prank(buyer);
        escrow.clearFingerprintChallengeWithAttestation(
            tradeId, resolutionHash, attestationHash, _sig(buyerKey, resolutionBinding)
        );

        bytes32 routeHash = _h("route:audit-d6-after-matching-scope-clear");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        _assertState(tradeId, MarketplaceEscrow.State.RouteLocked);
    }

    function testAuditD6ConflictedArbiterMetadataIsNotParsedBeforeRuling() public {
        uint256 conflictedArbiterKey = 0xC0F11C7;
        address conflictedArbiter = vm.addr(conflictedArbiterKey);
        registry.registerActor(
            conflictedArbiter, MarketplaceActorRegistry.Role.Arbiter, _h("arbiter-actor:audit-d6-conflicted")
        );
        registry.registerArbiter(
            conflictedArbiter, _h("arbiter-authority:audit-d6-undisclosed-seller-stake"), uint96(1 ether)
        );

        uint256 tradeId = _createAndBondWithArbiter(conflictedArbiter, 1 ether, 0.1 ether, 0.01 ether);
        _commitItemFingerprint(tradeId, _h("fingerprint:audit-d6-conflicted-arbiter"));
        _commitInventoryLock(tradeId, _h("inventory:audit-d6-conflicted-arbiter"));
        bytes32 routeHash = _h("route:audit-d6-conflicted-arbiter");
        _commitRoute(tradeId, routeHash, false, true, 1 ether);
        _markDeliveredBySeller(tradeId, "delivery:audit-d6-conflicted-arbiter");

        bytes32 claimHash = _h("claim:audit-d6-conflicted-arbiter");
        vm.prank(buyer);
        escrow.openClaim{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _commitDefaultPostHandoffRemedy(tradeId, 1 ether);

        bytes32 rulingHash = _h("ruling:audit-d6-conflicted-arbiter");
        vm.prank(conflictedArbiter);
        escrow.resolveClaim(tradeId, rulingHash, 5_000, 5_000, true, _sig(conflictedArbiterKey, rulingHash));

        _assertState(tradeId, MarketplaceEscrow.State.Settled);
    }

    function testPacketGateRejectsWrongSigner() public {
        uint256 tradeId = _createAndBond(1 ether, 0.1 ether, 0.01 ether);

        bytes32 proofHash = _h("seller-proof-with-buyer-signature");
        vm.expectRevert(abi.encodeWithSelector(MarketplaceEscrow.BadSignature.selector, seller, proofHash));
        vm.prank(seller);
        escrow.attachProof(tradeId, proofHash, _sig(buyerKey, proofHash));
    }

    function _createAndBond(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _createAndBondWithoutInventoryLock(escrowAmount, sellerBond, disputeBond);
        _commitItemFingerprint(tradeId, keccak256(abi.encodePacked("fingerprint:vintage-card:", tradeId)));
        _commitInventoryLock(tradeId, keccak256(abi.encodePacked("inventory:vintage-card:", tradeId)));
    }

    function _createAndBondWithFloorJudgmentRoute(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _createPendingTrade(escrowAmount, sellerBond, disputeBond);
        _commitFloorJudgmentRoute(tradeId, _floorJudgmentRoute());

        vm.prank(seller);
        escrow.acceptAndBond{value: sellerBond}(tradeId);

        _commitItemFingerprint(tradeId, keccak256(abi.encodePacked("fingerprint:vintage-card:", tradeId)));
        _commitInventoryLock(tradeId, keccak256(abi.encodePacked("inventory:vintage-card:", tradeId)));
    }

    function _createAndBondWithoutInventoryLock(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _createAndBondWithArbiter(arbiter, escrowAmount, sellerBond, disputeBond);
    }

    function _createAndBondWithArbiter(address arbiter_, uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        bytes32 intentHash = _h("intent:vintage-card");
        bytes32 termsHash = _h("terms:v1");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, escrowAmount, arbiter_);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.prank(buyer);
        tradeId = escrow.createTrade{value: escrowAmount}(
            seller,
            arbiter_,
            sellerBond,
            disputeBond,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter_),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
        committedAlphaPolicySnapshots[tradeId] = escrow.alphaAdmissionPolicyHash(tradeId, alphaPolicy);

        vm.prank(seller);
        escrow.acceptAndBond{value: sellerBond}(tradeId);
    }

    function _createPendingTrade(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        bytes32 intentHash = _h("intent:vintage-card");
        bytes32 termsHash = _h("terms:v1");
        uint256 expectedTradeId = escrow.nextTradeId();
        MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy =
            _defaultAlphaPolicy(expectedTradeId, escrowAmount, arbiter);
        bytes memory alphaPolicySignature = _alphaPolicySignature(expectedTradeId, alphaPolicy);
        vm.prank(buyer);
        tradeId = escrow.createTrade{value: escrowAmount}(
            seller,
            arbiter,
            sellerBond,
            disputeBond,
            2 days,
            intentHash,
            termsHash,
            _defaultJscHash(intentHash, termsHash, arbiter),
            replacementArbiter,
            alphaPolicy,
            alphaPolicySignature,
            _sig(buyerKey, intentHash),
            _sig(buyerKey, termsHash)
        );
        committedAlphaPolicySnapshots[tradeId] = escrow.alphaAdmissionPolicyHash(tradeId, alphaPolicy);
    }

    function _commitFloorJudgmentRoute(uint256 tradeId, MarketplaceEscrow.FloorJudgmentRoute memory route)
        internal
        returns (bytes32 routeHash)
    {
        routeHash = escrow.floorJudgmentRouteHash(tradeId, route);
        vm.prank(buyer);
        escrow.commitFloorJudgmentRoute(tradeId, route, _sig(buyerKey, routeHash));
    }

    function _floorJudgmentRoute() internal view returns (MarketplaceEscrow.FloorJudgmentRoute memory route) {
        address[] memory members = new address[](2);
        members[0] = replacementArbiter;
        members[1] = floorPanelMember;
        route = MarketplaceEscrow.FloorJudgmentRoute({
            panelMembers: members,
            requiredSignatures: 2,
            appealWindowSeconds: _floorAppealWindow(),
            appealAuthorityHash: _h("appeal:g5-floor-independent-panel"),
            panelMetadataHash: _h("panel:g5-floor-route-v0")
        });
    }

    function _openClaimWithVerifierRoute(MarketplaceEscrow.JscVerifierRoute memory route)
        internal
        returns (uint256 tradeId, bytes32 routeHash)
    {
        tradeId = _createPendingTrade(1 ether, 0.1 ether, 0.01 ether);
        routeHash = _commitVerifierRoute(tradeId, route);

        bytes memory routeAcceptanceSignature = _jscRouteAcceptanceSignature(tradeId, routeHash);
        vm.prank(seller);
        escrow.acceptAndBondWithJscVerifierRoute{value: 0.1 ether}(tradeId, routeHash, routeAcceptanceSignature);

        _commitItemFingerprint(tradeId, keccak256(abi.encodePacked("fingerprint:vintage-card:", tradeId)));
        _commitInventoryLock(tradeId, keccak256(abi.encodePacked("inventory:vintage-card:", tradeId)));

        bytes32 routeCommitmentHash = _h("route:g3-verifier-route");
        _commitRoute(tradeId, routeCommitmentHash, false, true, 1 ether);
        _markDeliveredBySeller(tradeId, "delivery:g3-verifier-route");

        bytes32 claimHash = _h("claim:g3-verifier-route");
        vm.prank(buyer);
        escrow.openClaim{value: 0.01 ether}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _commitDefaultPostHandoffRemedy(tradeId, 1 ether);
    }

    function _commitVerifierRoute(uint256 tradeId, MarketplaceEscrow.JscVerifierRoute memory route)
        internal
        returns (bytes32 routeHash)
    {
        routeHash = escrow.jscVerifierRouteHash(tradeId, route);
        vm.prank(buyer);
        escrow.commitJscVerifierRoute(tradeId, route, _sig(buyerKey, routeHash));
    }

    function _jscRouteAcceptanceSignature(uint256 tradeId, bytes32 routeHash) internal returns (bytes memory) {
        return _sig(sellerKey, escrow.jscVerifierRouteAcceptanceHash(tradeId, routeHash));
    }

    function _privateAdvisorRoute() internal view returns (MarketplaceEscrow.JscVerifierRoute memory) {
        return MarketplaceEscrow.JscVerifierRoute({
            routeClass: MarketplaceEscrow.VerifierRouteClass.BuyerDesignated,
            authorityLevel: MarketplaceEscrow.VerifierAuthorityLevel.PrivateAdvisor,
            acceptedVerifier: verifier,
            scopeHash: _h("scope:g3-buyer-advisor"),
            evidenceFloorHash: _h("evidence-floor:g3-buyer-advisor"),
            feeScheduleHash: bytes32(0),
            feePayer: MarketplaceEscrow.FeePayer.None,
            feeOutcomeIndependent: false,
            buyerDisputeBondRequired: 0,
            verifierBondRequired: 0,
            verifierExposureCap: 0,
            verifierBondTailSeconds: 0,
            appealHash: bytes32(0),
            witnessCanSettle: false
        });
    }

    function _settlementVerifierRoute(uint256 disputeBond)
        internal
        view
        returns (MarketplaceEscrow.JscVerifierRoute memory)
    {
        return MarketplaceEscrow.JscVerifierRoute({
            routeClass: MarketplaceEscrow.VerifierRouteClass.BuyerDesignated,
            authorityLevel: MarketplaceEscrow.VerifierAuthorityLevel.SettlementVerifier,
            acceptedVerifier: verifier,
            scopeHash: _h("scope:g3-settlement-verifier"),
            evidenceFloorHash: _h("evidence-floor:g3-settlement-verifier"),
            feeScheduleHash: _h("fee:g3-flat-buyer-paid"),
            feePayer: MarketplaceEscrow.FeePayer.Buyer,
            feeOutcomeIndependent: true,
            buyerDisputeBondRequired: disputeBond,
            verifierBondRequired: 0.05 ether,
            verifierExposureCap: 0.05 ether,
            verifierBondTailSeconds: uint64(1 days),
            appealHash: _h("appeal:g3-neutral-panel"),
            witnessCanSettle: true
        });
    }

    function _defaultAlphaPolicy(uint256 tradeId, uint256 escrowAmount, address arbiter_)
        internal
        view
        returns (MarketplaceEscrow.AlphaAdmissionPolicy memory)
    {
        uint64 epochId = escrow.currentAlphaEpochId();
        return MarketplaceEscrow.AlphaAdmissionPolicy({
            policyHash: keccak256(abi.encodePacked("alpha-policy:v1:", tradeId)),
            policyAuthority: replacementArbiter,
            version: escrow.ALPHA_POLICY_VERSION(),
            effectiveBlock: uint64(block.number),
            routeClass: _h("route-class:curated-low-value"),
            maxTradeValue: escrowAmount,
            principalExposureAfter: escrow.alphaPrincipalExposure(buyer) + escrowAmount,
            maxPrincipalExposure: 100 ether,
            controlClusterId: _h("cluster:buyer-seller-low-value"),
            controlClusterExposureAfter: escrow.alphaControlClusterExposure(_h("cluster:buyer-seller-low-value"))
                + escrowAmount,
            maxControlClusterExposure: 100 ether,
            custodianId: _h("custodian:self-ship-low-value"),
            custodianExposureAfter: escrow.alphaCustodianExposure(_h("custodian:self-ship-low-value")) + escrowAmount,
            maxCustodianExposure: 100 ether,
            verifier: address(0),
            verifierExposureAfter: 0,
            maxVerifierExposure: 1 ether,
            judgmentAuthority: arbiter_,
            judgmentAuthorityExposureAfter: escrow.alphaJudgmentAuthorityExposure(arbiter_) + escrowAmount,
            maxJudgmentAuthorityExposure: 100 ether,
            registryVersionHash: _h("registry:alpha:v1"),
            registryVersionExposureAfter: escrow.alphaRegistryVersionExposure(_h("registry:alpha:v1")) + escrowAmount,
            maxRegistryVersionExposure: 100 ether,
            epochId: epochId,
            globalEpochLossAfter: escrow.alphaEpochExposure(epochId) + escrowAmount,
            maxGlobalEpochLoss: 100 ether,
            deliveryMode: _h("delivery:tracked-or-cowitnessed"),
            disputeBranch: _h("dispute:manual-dual-control"),
            manualOverride: false,
            manualAuthority: address(0),
            manualSecondApprover: address(0),
            manualReasonHash: bytes32(0),
            manualOverrideLoss: 0,
            manualRemainingLossBudget: 0
        });
    }

    function _alphaPolicySignature(uint256 tradeId, MarketplaceEscrow.AlphaAdmissionPolicy memory alphaPolicy)
        internal
        returns (bytes memory)
    {
        return _sig(replacementArbiterKey, escrow.alphaAdmissionPolicyHash(tradeId, alphaPolicy));
    }

    function _defaultJscHash(bytes32 intentHash, bytes32 termsHash, address arbiter_) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                "jsc:arbitration-ladder:v0.1",
                address(escrow),
                block.chainid,
                intentHash,
                termsHash,
                arbiter_,
                replacementArbiter
            )
        );
    }

    function _challengeResolutionScope() internal pure returns (bytes32) {
        return keccak256("scope:fingerprint-challenge-review");
    }

    function _floorRulingSignature(
        uint256 tradeId,
        bytes32 rulingHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer
    ) internal returns (bytes memory) {
        return _sig(
            replacementArbiterKey,
            escrow.floorRulingHash(tradeId, rulingHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer)
        );
    }

    function _verifierRulingSignature(
        uint256 tradeId,
        bytes32 rulingHash,
        bytes32 scopeHash,
        uint16 buyerRefundBps,
        uint16 sellerBondPenaltyBps,
        bool returnDisputeBondToBuyer
    ) internal returns (bytes memory) {
        return _sig(
            verifierKey,
            escrow.verifierSettlementRulingHash(
                tradeId, rulingHash, scopeHash, buyerRefundBps, sellerBondPenaltyBps, returnDisputeBondToBuyer
            )
        );
    }

    function _unresolvableClaimReceiptSignature(uint256 tradeId, bytes32 rulingHash, bytes32 receiptHash)
        internal
        returns (bytes memory)
    {
        return _sig(replacementArbiterKey, escrow.unresolvableClaimReceiptHash(tradeId, rulingHash, receiptHash));
    }

    function _commitItemFingerprint(uint256 tradeId, bytes32 itemFingerprintHash) internal {
        vm.prank(seller);
        escrow.commitItemFingerprint(tradeId, itemFingerprintHash, _sig(sellerKey, itemFingerprintHash));
        committedItemFingerprints[tradeId] = itemFingerprintHash;
    }

    function _approveFingerprintVerifier(uint256 tradeId, address verifier_) internal {
        _approveVerifierScope(tradeId, verifier_, escrow.FINGERPRINT_SCOPE_SET_HASH());
    }

    function _approveVerifierScope(uint256 tradeId, address verifier_, bytes32 scopeSetHash) internal {
        bytes32 approvalHash = keccak256(abi.encodePacked("verifier-scope:", tradeId, verifier_, scopeSetHash));
        bytes32 scopedApprovalHash = escrow.verifierScopeApprovalHash(tradeId, verifier_, scopeSetHash, approvalHash);
        vm.prank(buyer);
        escrow.approveVerifierScope(tradeId, verifier_, scopeSetHash, approvalHash, _sig(buyerKey, scopedApprovalHash));
    }

    function _commitInventoryLock(uint256 tradeId, bytes32 inventoryLockHash) internal {
        bytes32 itemFingerprintHash = committedItemFingerprints[tradeId];
        bytes32 bindingHash = escrow.inventoryLockBindingHash(tradeId, inventoryLockHash, itemFingerprintHash);
        vm.prank(seller);
        escrow.commitInventoryLock(tradeId, inventoryLockHash, itemFingerprintHash, _sig(sellerKey, bindingHash));
        committedInventoryLocks[tradeId] = inventoryLockHash;
    }

    function _commitRoute(
        uint256 tradeId,
        bytes32 routeHash,
        bool inPersonAllowed,
        bool insured,
        uint256 declaredInsurance
    ) internal returns (bytes32 spendabilityHash) {
        bytes32 wallBundleHash = _routeWallBundleRoot(tradeId, routeHash);
        bytes32 assemblyHistoryHash = _routeAssemblyHistory(tradeId, routeHash);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        spendabilityHash = _routeSpendability(tradeId, routeHash, wallBundleHash, assemblyHistoryHash, typedSpendability);
        bytes32 routeAssemblyWitnessHash =
            _routeAssemblyWitness(tradeId, routeHash, spendabilityHash, wallBundleHash, assemblyHistoryHash);
        vm.prank(seller);
        escrow.commitRoute(
            tradeId,
            routeHash,
            spendabilityHash,
            wallBundleHash,
            assemblyHistoryHash,
            routeAssemblyWitnessHash,
            inPersonAllowed,
            insured,
            declaredInsurance,
            typedSpendability,
            _sig(sellerKey, routeHash)
        );
        committedRouteHashes[tradeId] = routeHash;
        committedRouteAssemblyWitnesses[tradeId] = routeAssemblyWitnessHash;
    }

    function _routeSpendability(uint256 tradeId, bytes32 routeHash) internal view returns (bytes32) {
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        return _routeSpendability(
            tradeId,
            routeHash,
            _routeWallBundleRoot(tradeId, routeHash),
            _routeAssemblyHistory(tradeId, routeHash),
            typedSpendability
        );
    }

    function _routeSpendability(uint256 tradeId, bytes32 routeHash, bytes32 assemblyHistoryHash)
        internal
        view
        returns (bytes32)
    {
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        return _routeSpendability(
            tradeId, routeHash, _routeWallBundleRoot(tradeId, routeHash), assemblyHistoryHash, typedSpendability
        );
    }

    function _routeSpendability(
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash,
        MarketplaceEscrow.TypedSpendability memory typedSpendability
    ) internal view returns (bytes32) {
        bytes32 boundArtifactsHash = keccak256(
            abi.encode(
                routeHash,
                wallBundleHash,
                assemblyHistoryHash,
                committedItemFingerprints[tradeId],
                committedInventoryLocks[tradeId]
            )
        );
        return _typedSpendabilityDigest(
            tradeId,
            keccak256("marketplace.gate.route_commitment.v0.1"),
            keccak256("marketplace.leg.route_commitment.v0.1"),
            boundArtifactsHash,
            typedSpendability
        );
    }

    function _typedSpendability(uint256 tradeId, address issuer)
        internal
        view
        returns (MarketplaceEscrow.TypedSpendability memory)
    {
        return MarketplaceEscrow.TypedSpendability({
            issuer: issuer,
            canonicalPreimageHash: keccak256(abi.encodePacked("typed-spendability-preimage:", tradeId, issuer)),
            constituentClaimsHash: keccak256(abi.encodePacked("typed-spendability-claims:", tradeId, issuer)),
            sourceClaimsAvailabilityHash: _h("source-claims-available:typed-spendability"),
            validatorCodeHash: _h("validator-code:typed-spendability:v1"),
            validatorPolicyHash: _h("validator-policy:alpha:v1"),
            issuerRoleHash: _h("issuer-role:deterministic-validator"),
            issuerAuthorityCeiling: 1,
            issuerConflictRef: _h("issuer-conflict-ref:clear"),
            registrySnapshotHash: committedAlphaPolicySnapshots[tradeId],
            expiryBlock: uint64(block.number + 1000),
            dataAvailabilityHash: _h("data-availability:typed-spendability"),
            preimageAvailabilityHash: _h("preimage-available:typed-spendability"),
            notClaimingHash: _h("not-claiming:physical-truth-or-semantic-independence"),
            sourceBasisHash: _h("source-basis:typed-claims"),
            sourceClaimAuthor: buyer,
            downgraded: false,
            valueCapped: false
        });
    }

    function _routeWallBundleRoot(uint256 tradeId, bytes32 routeHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("wall-bundle:route:", tradeId, routeHash));
    }

    function _routeAssemblyHistory(uint256 tradeId, bytes32 routeHash) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked("assembly-history:route:", tradeId, routeHash, _routeWallBundleRoot(tradeId, routeHash))
        );
    }

    function _routeAssemblyWitness(
        uint256 tradeId,
        bytes32 routeHash,
        bytes32 spendabilityHash,
        bytes32 wallBundleHash,
        bytes32 assemblyHistoryHash
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256(
                    "RouteAssemblyWitness(address escrow,uint256 chainId,uint256 tradeId,bytes32 routeHash,bytes32 routeSpendabilityHash,bytes32 wallBundleHash,bytes32 assemblyHistoryHash,bytes32 itemFingerprintHash,bytes32 inventoryLockHash,bytes32 gateHash)"
                ),
                address(escrow),
                block.chainid,
                tradeId,
                routeHash,
                spendabilityHash,
                wallBundleHash,
                assemblyHistoryHash,
                committedItemFingerprints[tradeId],
                committedInventoryLocks[tradeId],
                keccak256("marketplace.gate.route_commitment.v0.1")
            )
        );
    }

    function _deliverTrade(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _createAndBond(escrowAmount, sellerBond, disputeBond);

        bytes32 routeHash = _h("route:pressure");
        _commitRoute(tradeId, routeHash, false, true, escrowAmount);
        _markDeliveredBySeller(tradeId, "delivery:pressure");
    }

    function _deliverTradeWithFloorJudgmentRoute(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _createAndBondWithFloorJudgmentRoute(escrowAmount, sellerBond, disputeBond);

        bytes32 routeHash = _h("route:pressure:g5-floor");
        _commitRoute(tradeId, routeHash, false, true, escrowAmount);
        _markDeliveredBySeller(tradeId, "delivery:pressure:g5-floor");
    }

    function _markDeliveredBySeller(uint256 tradeId, string memory label) internal {
        bytes32 deliveryHash = _h(label);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, seller);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, seller);
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, spendabilityHash);
        vm.prank(seller);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(sellerKey, deliveryHash)
        );
    }

    function _markDeliveredByArbiter(uint256 tradeId, string memory label) internal {
        bytes32 deliveryHash = _h(label);
        MarketplaceEscrow.TypedSpendability memory typedSpendability = _typedSpendability(tradeId, arbiter);
        MarketplaceEscrow.DeliveryTriggerPolicy memory deliveryPolicy = _deliveryPolicy(tradeId, arbiter);
        bytes32 spendabilityHash = _deliverySpendability(tradeId, deliveryHash, typedSpendability);
        bytes32 witnessHash = _deliveryWitness(tradeId, deliveryHash, spendabilityHash);
        vm.prank(arbiter);
        escrow.markDelivered(
            tradeId,
            deliveryHash,
            spendabilityHash,
            witnessHash,
            deliveryPolicy,
            typedSpendability,
            _sig(arbiterKey, deliveryHash)
        );
    }

    function _deliverySpendability(uint256 tradeId, bytes32 deliveryHash) internal view returns (bytes32) {
        return _deliverySpendability(tradeId, deliveryHash, _typedSpendability(tradeId, seller));
    }

    function _deliverySpendability(
        uint256 tradeId,
        bytes32 deliveryHash,
        MarketplaceEscrow.TypedSpendability memory typedSpendability
    )
        internal
        view
        returns (bytes32)
    {
        bytes32 boundArtifactsHash = keccak256(
            abi.encode(committedRouteHashes[tradeId], deliveryHash, committedRouteAssemblyWitnesses[tradeId])
        );
        return _typedSpendabilityDigest(
            tradeId,
            keccak256("marketplace.gate.delivery_confirmation.v0.1"),
            keccak256("marketplace.leg.delivery_confirmation.v0.1"),
            boundArtifactsHash,
            typedSpendability
        );
    }

    function _deliveryPolicy(uint256 tradeId, address witness)
        internal
        view
        returns (MarketplaceEscrow.DeliveryTriggerPolicy memory)
    {
        return MarketplaceEscrow.DeliveryTriggerPolicy({
            policyHash: keccak256(abi.encodePacked("delivery-policy:", tradeId, witness)),
            witnessClassHash: _h("witness-class:carrier-or-independent-cowitness"),
            witnessIssuer: witness,
            issuerConflictRef: _h("delivery-issuer-conflict-ref:clear-or-cowitnessed"),
            scopeHash: committedRouteHashes[tradeId],
            expiryBlock: uint64(block.number + 1000),
            challengeDeadlineBlock: uint64(block.number),
            settlementCeiling: 100 ether,
            sellerAssociated: witness == seller,
            independentWitnessCount: witness == seller ? 1 : 0,
            missingWitnessCanEstablishNonDelivery: false
        });
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
                keccak256(
                    "SpendabilityDigest(address escrow,uint256 chainId,uint256 tradeId,bytes32 gateHash,bytes32 legHash,bytes32 boundArtifactsHash,address issuer)"
                ),
                address(escrow),
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
        MarketplaceEscrow.TypedSpendability memory spendability
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256(
                    "TypedSpendabilityDigest(address escrow,uint256 chainId,uint256 tradeId,bytes32 gateHash,bytes32 legHash,bytes32 boundArtifactsHash,address issuer,bytes32 canonicalPreimageHash,bytes32 constituentClaimsHash,bytes32 sourceClaimsAvailabilityHash,bytes32 validatorCodeHash,bytes32 validatorPolicyHash,bytes32 issuerRoleHash,uint8 issuerAuthorityCeiling,bytes32 issuerConflictRef,bytes32 registrySnapshotHash,uint64 expiryBlock,bytes32 dataAvailabilityHash,bytes32 preimageAvailabilityHash,bytes32 notClaimingHash,bytes32 sourceBasisHash,address sourceClaimAuthor,bool downgraded,bool valueCapped)"
                ),
                address(escrow),
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

    function _deliveryWitness(uint256 tradeId, bytes32 deliveryHash, bytes32 spendabilityHash)
        internal
        view
        returns (bytes32)
    {
        return escrow.deliveryWitnessHash(tradeId, deliveryHash, spendabilityHash);
    }

    function _openClaim(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _deliverTrade(escrowAmount, sellerBond, disputeBond);

        bytes32 claimHash = _h("claim:pressure");
        vm.prank(buyer);
        escrow.openClaim{value: disputeBond}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _commitDefaultPostHandoffRemedy(tradeId, escrowAmount);
    }

    function _openClaimWithFloorJudgmentRoute(uint256 escrowAmount, uint256 sellerBond, uint256 disputeBond)
        internal
        returns (uint256 tradeId)
    {
        tradeId = _deliverTradeWithFloorJudgmentRoute(escrowAmount, sellerBond, disputeBond);

        bytes32 claimHash = _h("claim:pressure:g5-floor");
        vm.prank(buyer);
        escrow.openClaim{value: disputeBond}(tradeId, claimHash, _sig(buyerKey, claimHash));
        _commitDefaultPostHandoffRemedy(tradeId, escrowAmount);
    }

    function _commitDefaultPostHandoffRemedy(uint256 tradeId, uint256 maxAmount) internal returns (bytes32 remedyHash) {
        MarketplaceEscrow.PostHandoffRemedy memory remedy = MarketplaceEscrow.PostHandoffRemedy({
            claimTypeHash: _h("claim-type:post-handoff-condition-or-authenticity"),
            remedyTypeHash: _h("remedy:refund-with-return-custody"),
            maxAmount: maxAmount,
            returnRequired: true,
            returnCustodyHash: keccak256(abi.encodePacked("return-custody:", tradeId)),
            evidenceRoot: keccak256(abi.encodePacked("evidence-root:claim:", tradeId)),
            appealFinalStateHash: escrow.APPEAL_FINAL_STATE_HASH(),
            nonReturnRemedyAllowed: false
        });
        remedyHash = escrow.postHandoffRemedyHash(tradeId, remedy);
        vm.prank(buyer);
        escrow.commitPostHandoffRemedy(tradeId, remedy, _sig(buyerKey, remedyHash));
    }

    function _floorPanelAttestations(bytes32 payloadHash)
        internal
        returns (address[] memory panelSigners, bytes[] memory panelSignatures)
    {
        panelSigners = new address[](1);
        panelSignatures = new bytes[](1);
        panelSigners[0] = floorPanelMember;
        panelSignatures[0] = _sig(floorPanelMemberKey, payloadHash);
    }

    function _floorAppealWindow() internal pure returns (uint64) {
        return 2 hours;
    }

    function _assertState(uint256 tradeId, MarketplaceEscrow.State expected) internal view {
        MarketplaceEscrow.State actual = escrow.getState(tradeId);
        if (actual != expected) revert("unexpected state");
    }

    function _assertTrue(bool value, string memory message) internal pure {
        if (!value) revert(message);
    }

    function _assertEq(uint256 actual, uint256 expected, string memory message) internal pure {
        if (actual != expected) revert(message);
    }

    function _h(string memory value) internal pure returns (bytes32) {
        return keccak256(bytes(value));
    }

    function _sig(uint256 privateKey, bytes32 payloadHash) internal returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
