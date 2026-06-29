// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ThinPilotEscrow } from "../src/ThinPilotEscrow.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function prank(address sender) external;
    function warp(uint256 newTimestamp) external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert(bytes4 selector) external;
}

contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount) return false;
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) return false;
        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract ThinPilotEscrowTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant USDC_UNIT = 1e6;
    uint256 internal constant VALUE_CAP = 500 * USDC_UNIT;
    uint256 internal constant TRADE_AMOUNT = 125 * USDC_UNIT;
    uint256 internal constant SHIPPED_TIMEOUT = 3 days;
    uint256 internal constant INSPECTION_WINDOW = 2 days;

    address internal buyer = address(0xB0B);
    address internal seller = address(0x5E11);
    address internal arbiter = address(0xA9B);
    address internal stranger = address(0xBAD);

    MockUSDC internal usdc;
    ThinPilotEscrow internal escrow;

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new ThinPilotEscrow(address(usdc), VALUE_CAP, SHIPPED_TIMEOUT);
        usdc.mint(buyer, 1_000 * USDC_UNIT);
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 100 ether);
        vm.deal(arbiter, 100 ether);
        vm.deal(stranger, 100 ether);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function testHappyPathBuyerAcceptsAndSellerReceivesUsdc() public {
        uint256 tradeId = _createTrade();
        _shipAndOpen(tradeId);

        vm.prank(buyer);
        escrow.accept(tradeId);

        _assertState(tradeId, ThinPilotEscrow.State.Settled);
        _assertEq(usdc.balanceOf(seller), TRADE_AMOUNT, "seller paid");
        _assertEq(usdc.balanceOf(address(escrow)), 0, "escrow drained");
    }

    function testCapBlocksAboveValueCap() public {
        vm.prank(buyer);
        vm.expectRevert(ThinPilotEscrow.BadAmount.selector);
        escrow.createTrade(
            seller,
            arbiter,
            VALUE_CAP + 1,
            _h("card:azuki-alpha"),
            _h("terms:pilot"),
            INSPECTION_WINDOW
        );
    }

    function testArbiterMustBeNonParty() public {
        vm.prank(buyer);
        vm.expectRevert(ThinPilotEscrow.BadAddress.selector);
        escrow.createTrade(
            seller,
            buyer,
            TRADE_AMOUNT,
            _h("card:azuki-alpha"),
            _h("terms:pilot"),
            INSPECTION_WINDOW
        );

        vm.prank(buyer);
        vm.expectRevert(ThinPilotEscrow.BadAddress.selector);
        escrow.createTrade(
            seller,
            seller,
            TRADE_AMOUNT,
            _h("card:azuki-alpha"),
            _h("terms:pilot"),
            INSPECTION_WINDOW
        );
    }

    function testSellerCannotSingleWitnessDeliveryOrAcceptance() public {
        uint256 tradeId = _createTrade();
        vm.prank(seller);
        escrow.markShipped(tradeId, _h("tracking:1z"));

        vm.prank(seller);
        vm.expectRevert(ThinPilotEscrow.Unauthorized.selector);
        escrow.confirmReceived(tradeId);

        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(
                ThinPilotEscrow.ShippedTimeoutOpen.selector, block.timestamp + SHIPPED_TIMEOUT
            )
        );
        escrow.openInspection(tradeId);

        vm.prank(buyer);
        escrow.confirmReceived(tradeId);

        vm.prank(seller);
        vm.expectRevert(ThinPilotEscrow.Unauthorized.selector);
        escrow.accept(tradeId);
    }

    function testShippedTimeoutCanOpenInspectionButStillDoesNotReleaseFunds() public {
        uint256 tradeId = _createTrade();
        vm.prank(seller);
        escrow.markShipped(tradeId, _h("tracking:1z"));

        vm.warp(block.timestamp + SHIPPED_TIMEOUT);
        vm.prank(stranger);
        escrow.openInspection(tradeId);

        _assertState(tradeId, ThinPilotEscrow.State.InspectionOpen);
        _assertEq(usdc.balanceOf(seller), 0, "seller not paid by delivery open");
        _assertEq(usdc.balanceOf(address(escrow)), TRADE_AMOUNT, "funds still escrowed");
    }

    function testInspectionTimeoutIsDeemedAcceptNotSilentRefund() public {
        uint256 tradeId = _createTrade();
        _shipAndOpen(tradeId);

        vm.warp(block.timestamp + INSPECTION_WINDOW);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ThinPilotEscrow.InspectionWindowElapsed.selector, block.timestamp
            )
        );
        escrow.dispute(tradeId, _h("condition:late"));

        vm.prank(stranger);
        escrow.settleByTimeout(tradeId);

        _assertState(tradeId, ThinPilotEscrow.State.Settled);
        _assertEq(usdc.balanceOf(seller), TRADE_AMOUNT, "seller paid on deemed accept");
        _assertEq(usdc.balanceOf(buyer), 1_000 * USDC_UNIT - TRADE_AMOUNT, "buyer not refunded");
        _assertEq(usdc.balanceOf(address(escrow)), 0, "escrow drained");
    }

    function testBuyerRefundRequiresReturnCustody() public {
        uint256 tradeId = _createTrade();
        _shipAndOpen(tradeId);

        vm.prank(buyer);
        escrow.dispute(tradeId, _h("condition:crease"));

        vm.prank(arbiter);
        vm.expectRevert(ThinPilotEscrow.ReturnCustodyRequired.selector);
        escrow.resolve(tradeId, ThinPilotEscrow.Outcome.BUYER, 0);

        vm.prank(seller);
        escrow.confirmReturnCustody(tradeId);

        vm.prank(arbiter);
        escrow.resolve(tradeId, ThinPilotEscrow.Outcome.BUYER, 0);

        _assertState(tradeId, ThinPilotEscrow.State.Resolved);
        _assertEq(usdc.balanceOf(buyer), 1_000 * USDC_UNIT, "buyer refunded after return custody");
        _assertEq(usdc.balanceOf(seller), 0, "seller not paid");
        _assertEq(usdc.balanceOf(address(escrow)), 0, "escrow drained");
    }

    function testSplitRefundRequiresReturnCustody() public {
        uint256 tradeId = _createTrade();
        _shipAndOpen(tradeId);

        vm.prank(buyer);
        escrow.dispute(tradeId, _h("condition:minor"));

        vm.prank(arbiter);
        vm.expectRevert(ThinPilotEscrow.ReturnCustodyRequired.selector);
        escrow.resolve(tradeId, ThinPilotEscrow.Outcome.SPLIT, 4_000);

        vm.prank(arbiter);
        escrow.confirmReturnCustody(tradeId);
        vm.prank(arbiter);
        escrow.resolve(tradeId, ThinPilotEscrow.Outcome.SPLIT, 4_000);

        _assertState(tradeId, ThinPilotEscrow.State.Resolved);
        _assertEq(
            usdc.balanceOf(buyer),
            1_000 * USDC_UNIT - (TRADE_AMOUNT * 6_000 / 10_000),
            "buyer split"
        );
        _assertEq(usdc.balanceOf(seller), TRADE_AMOUNT * 6_000 / 10_000, "seller split");
    }

    function testCancelBeforeShipRefundsBuyer() public {
        uint256 tradeId = _createTrade();
        vm.prank(buyer);
        escrow.cancelBeforeShip(tradeId);

        _assertState(tradeId, ThinPilotEscrow.State.Cancelled);
        _assertEq(usdc.balanceOf(buyer), 1_000 * USDC_UNIT, "buyer refunded");
        _assertEq(usdc.balanceOf(address(escrow)), 0, "escrow drained");
    }

    function _createTrade() internal returns (uint256 tradeId) {
        vm.prank(buyer);
        tradeId = escrow.createTrade(
            seller,
            arbiter,
            TRADE_AMOUNT,
            _h("card:azuki-alpha"),
            _h("terms:pilot"),
            INSPECTION_WINDOW
        );
        _assertState(tradeId, ThinPilotEscrow.State.Funded);
        _assertEq(usdc.balanceOf(address(escrow)), TRADE_AMOUNT, "funded");
    }

    function _shipAndOpen(uint256 tradeId) internal {
        vm.prank(seller);
        escrow.markShipped(tradeId, _h("tracking:1z"));
        _assertState(tradeId, ThinPilotEscrow.State.Shipped);

        vm.prank(buyer);
        escrow.confirmReceived(tradeId);
        _assertState(tradeId, ThinPilotEscrow.State.InspectionOpen);
    }

    function _assertState(uint256 tradeId, ThinPilotEscrow.State expected) internal view {
        (,,,,,,,,,,, ThinPilotEscrow.State state,,,) = escrow.trades(tradeId);
        require(state == expected, "bad state");
    }

    function _h(string memory value) internal pure returns (bytes32) {
        return keccak256(bytes(value));
    }

    function _assertEq(uint256 actual, uint256 expected, string memory label) internal pure {
        require(actual == expected, label);
    }
}
