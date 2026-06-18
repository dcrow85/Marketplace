// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { MarketplaceInventory } from "../src/MarketplaceInventory.sol";

interface Vm {
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function expectRevert(bytes calldata revertData) external;
}

contract MarketplaceInventoryTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    MarketplaceInventory inv;

    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);
    address constant SHOP = address(0x5409);
    address constant SHOP2 = address(0x5410);

    bytes32 constant ID = keccak256("instance:charizard:alice:c21");
    bytes32 constant CITATION = keccak256("catalog:9d17b8bf:PMCG1-021:rowhash");
    bytes32 constant ATT = keccak256("attestation:kanto-cards:0x21");

    function setUp() public {
        inv = new MarketplaceInventory();
    }

    function _registerAsAlice() internal {
        vm.prank(ALICE);
        inv.register(ID, CITATION);
    }

    function testRegisterSetsOwnerSelfHeld() public {
        _registerAsAlice();
        require(inv.ownerOf(ID) == ALICE, "owner should be Alice");
        (bool exists, bool locked,, address owner, address custodian, bytes32 cit,, uint64 nonce) =
            inv.items(ID);
        require(exists, "exists");
        require(!locked, "not locked");
        require(owner == ALICE && custodian == address(0), "self-held, no custodian");
        require(cit == CITATION, "citation bound");
        require(nonce == 0, "nonce starts at 0");
        require(!inv.isCustodyAttested(ID), "self-held is not attested");
    }

    function testRegisterRejectsDuplicate() public {
        _registerAsAlice();
        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceInventory.AlreadyRegistered.selector, ID));
        inv.register(ID, CITATION);
    }

    function testRegisterRejectsEmptyCitation() public {
        vm.prank(ALICE);
        vm.expectRevert(MarketplaceInventory.EmptyCitation.selector);
        inv.register(ID, bytes32(0));
    }

    function testTransferMovesOwnershipAndBumpsNonce() public {
        _registerAsAlice();
        vm.prank(ALICE);
        inv.transfer(ID, BOB, 0);
        require(inv.ownerOf(ID) == BOB, "owner should be Bob");
        (,,,,,,, uint64 nonce) = inv.items(ID);
        require(nonce == 1, "nonce bumped to 1");
    }

    function testTransferRejectsNonOwner() public {
        _registerAsAlice();
        vm.prank(BOB);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceInventory.NotOwner.selector, ID, BOB));
        inv.transfer(ID, BOB, 0);
    }

    function testTransferRejectsStaleNonce() public {
        _registerAsAlice();
        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceInventory.StaleTransferNonce.selector, ID, uint64(0), uint64(7)));
        inv.transfer(ID, BOB, 7); // expected 0 -> replayed/wrong nonce reverts
    }

    function testTransferBlockedWhileLocked() public {
        _registerAsAlice();
        vm.prank(ALICE);
        inv.lock(ID);
        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceInventory.ItemIsLocked.selector, ID));
        inv.transfer(ID, BOB, 0);
    }

    function testAssignCustodyAndAttest() public {
        _registerAsAlice();
        vm.prank(ALICE);
        inv.assignCustody(ID, MarketplaceInventory.Custody.Shop, SHOP);
        require(!inv.isCustodyAttested(ID), "assigned but not yet attested");
        vm.prank(SHOP);
        inv.attestCustody(ID, ATT);
        require(inv.isCustodyAttested(ID), "custody attested -> enforceable");
        (,, MarketplaceInventory.Custody custody, address owner, address custodian,, bytes32 att,) =
            inv.items(ID);
        require(custody == MarketplaceInventory.Custody.Shop, "shop custody");
        require(custodian == SHOP && att == ATT, "custodian + attestation bound");
        require(owner == ALICE, "ownership unchanged by custody");
    }

    function testSelfCustodyCannotAttest() public {
        _registerAsAlice();
        vm.prank(SHOP);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceInventory.SelfCustodyCannotAttest.selector, ID));
        inv.attestCustody(ID, ATT);
    }

    function testOnlyAssignedCustodianCanAttest() public {
        _registerAsAlice();
        vm.prank(ALICE);
        inv.assignCustody(ID, MarketplaceInventory.Custody.Shop, SHOP);
        vm.prank(SHOP2);
        vm.expectRevert(abi.encodeWithSelector(MarketplaceInventory.NotCustodian.selector, ID, SHOP2));
        inv.attestCustody(ID, ATT);
    }

    function testTransferClearsCustodyAttestation() public {
        _registerAsAlice();
        vm.prank(ALICE);
        inv.assignCustody(ID, MarketplaceInventory.Custody.Vault, SHOP);
        vm.prank(SHOP);
        inv.attestCustody(ID, ATT);
        require(inv.isCustodyAttested(ID), "attested before transfer");
        vm.prank(ALICE);
        inv.transfer(ID, BOB, 0);
        require(!inv.isCustodyAttested(ID), "transfer clears stale attestation");
        (,, MarketplaceInventory.Custody custody, address owner,,,,) = inv.items(ID);
        require(custody == MarketplaceInventory.Custody.SelfHeld, "back to self-held");
        require(owner == BOB, "new owner re-declares custody");
    }

    function testLockUnlock() public {
        _registerAsAlice();
        vm.prank(ALICE);
        inv.lock(ID);
        (, bool locked,,,,,,) = inv.items(ID);
        require(locked, "locked");
        vm.prank(ALICE);
        inv.unlock(ID);
        (, bool locked2,,,,,,) = inv.items(ID);
        require(!locked2, "unlocked");
        vm.prank(ALICE);
        inv.transfer(ID, BOB, 0);
        require(inv.ownerOf(ID) == BOB, "transfer works after unlock");
    }
}
