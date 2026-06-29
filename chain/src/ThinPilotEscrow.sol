// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Thin USDC escrow for the first high-trust Cairn pilot.
/// @dev This contract moves funds and gates liveness only. It does not verify
/// authenticity, condition, custody truth, shipping truth, or physical possession.
contract ThinPilotEscrow {
    uint16 public constant BPS_DENOMINATOR = 10_000;

    enum State {
        None,
        Funded,
        Shipped,
        InspectionOpen,
        Settled,
        Disputed,
        Resolved,
        Cancelled
    }

    enum Outcome {
        SELLER,
        BUYER,
        SPLIT
    }

    struct Trade {
        address buyer;
        address seller;
        address arbiter;
        uint256 usdcAmount;
        bytes32 cardRefHash;
        bytes32 termsHash;
        bytes32 trackingHash;
        bytes32 disputeReasonHash;
        uint256 inspectionWindow;
        uint256 shippedAt;
        uint256 inspectionOpenedAt;
        State state;
        bool returnCustodyConfirmed;
        Outcome resolvedOutcome;
        uint16 buyerRefundBps;
    }

    IERC20 public immutable USDC;
    uint256 public immutable VALUE_CAP;
    uint256 public immutable SHIPPED_TIMEOUT;
    uint256 public nextTradeId = 1;

    mapping(uint256 tradeId => Trade) public trades;

    uint256 private locked = 1;

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address arbiter,
        uint256 usdcAmount,
        bytes32 cardRefHash,
        bytes32 termsHash,
        uint256 inspectionWindow
    );
    event Shipped(uint256 indexed tradeId, bytes32 trackingHash);
    event InspectionOpened(uint256 indexed tradeId, uint256 deadline);
    event Accepted(uint256 indexed tradeId, uint256 sellerAmount);
    event Disputed(uint256 indexed tradeId, bytes32 reasonHash);
    event ReturnCustodyConfirmed(uint256 indexed tradeId, address indexed confirmer);
    event Resolved(
        uint256 indexed tradeId,
        Outcome outcome,
        uint16 buyerRefundBps,
        uint256 buyerAmount,
        uint256 sellerAmount
    );
    event Refunded(uint256 indexed tradeId, address indexed buyer, uint256 amount);
    event Cancelled(uint256 indexed tradeId);

    error BadAddress();
    error BadAmount();
    error BadHash();
    error BadWindow();
    error BadState(State current);
    error Unauthorized();
    error TransferFailed();
    error ShippedTimeoutOpen(uint256 availableAt);
    error InspectionWindowOpen(uint256 availableAt);
    error InspectionWindowElapsed(uint256 elapsedAt);
    error ReturnCustodyRequired();
    error BadSplitBps();

    modifier nonReentrant() {
        require(locked == 1, "REENTRANCY");
        locked = 2;
        _;
        locked = 1;
    }

    modifier existingTrade(uint256 tradeId) {
        Trade storage trade = trades[tradeId];
        if (trade.state == State.None) revert BadState(State.None);
        _;
    }

    constructor(address usdc, uint256 valueCap, uint256 shippedTimeout) {
        if (usdc == address(0)) revert BadAddress();
        if (valueCap == 0) revert BadAmount();
        if (shippedTimeout == 0) revert BadWindow();
        USDC = IERC20(usdc);
        VALUE_CAP = valueCap;
        SHIPPED_TIMEOUT = shippedTimeout;
    }

    function createTrade(
        address seller,
        address arbiter,
        uint256 usdcAmount,
        bytes32 cardRefHash,
        bytes32 termsHash,
        uint256 inspectionWindow
    ) external nonReentrant returns (uint256 tradeId) {
        address buyer = msg.sender;
        if (seller == address(0) || arbiter == address(0)) revert BadAddress();
        if (seller == buyer || arbiter == buyer || arbiter == seller) revert BadAddress();
        if (usdcAmount == 0 || usdcAmount > VALUE_CAP) revert BadAmount();
        if (cardRefHash == bytes32(0) || termsHash == bytes32(0)) revert BadHash();
        if (inspectionWindow == 0) revert BadWindow();

        tradeId = nextTradeId++;
        trades[tradeId] = Trade({
            buyer: buyer,
            seller: seller,
            arbiter: arbiter,
            usdcAmount: usdcAmount,
            cardRefHash: cardRefHash,
            termsHash: termsHash,
            trackingHash: bytes32(0),
            disputeReasonHash: bytes32(0),
            inspectionWindow: inspectionWindow,
            shippedAt: 0,
            inspectionOpenedAt: 0,
            state: State.Funded,
            returnCustodyConfirmed: false,
            resolvedOutcome: Outcome.SELLER,
            buyerRefundBps: 0
        });

        _safeTransferFrom(buyer, address(this), usdcAmount);
        emit TradeCreated(
            tradeId, buyer, seller, arbiter, usdcAmount, cardRefHash, termsHash, inspectionWindow
        );
    }

    function markShipped(uint256 tradeId, bytes32 trackingHash) external existingTrade(tradeId) {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.seller) revert Unauthorized();
        if (trade.state != State.Funded) revert BadState(trade.state);
        if (trackingHash == bytes32(0)) revert BadHash();
        trade.state = State.Shipped;
        trade.trackingHash = trackingHash;
        trade.shippedAt = block.timestamp;
        emit Shipped(tradeId, trackingHash);
    }

    function confirmReceived(uint256 tradeId) external existingTrade(tradeId) {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.buyer) revert Unauthorized();
        _openInspection(tradeId, trade);
    }

    function openInspection(uint256 tradeId) external existingTrade(tradeId) {
        Trade storage trade = trades[tradeId];
        if (trade.state != State.Shipped) revert BadState(trade.state);
        uint256 availableAt = trade.shippedAt + SHIPPED_TIMEOUT;
        if (block.timestamp < availableAt) revert ShippedTimeoutOpen(availableAt);
        _openInspection(tradeId, trade);
    }

    function accept(uint256 tradeId) external existingTrade(tradeId) nonReentrant {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.state != State.InspectionOpen) revert BadState(trade.state);
        uint256 amount = trade.usdcAmount;
        trade.state = State.Settled;
        _safeTransfer(trade.seller, amount);
        emit Accepted(tradeId, amount);
    }

    function settleByTimeout(uint256 tradeId) external existingTrade(tradeId) nonReentrant {
        Trade storage trade = trades[tradeId];
        if (trade.state != State.InspectionOpen) revert BadState(trade.state);
        uint256 availableAt = trade.inspectionOpenedAt + trade.inspectionWindow;
        if (block.timestamp < availableAt) revert InspectionWindowOpen(availableAt);
        uint256 amount = trade.usdcAmount;
        trade.state = State.Settled;
        _safeTransfer(trade.seller, amount);
        emit Accepted(tradeId, amount);
    }

    function dispute(uint256 tradeId, bytes32 reasonHash) external existingTrade(tradeId) {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.state != State.InspectionOpen) revert BadState(trade.state);
        if (reasonHash == bytes32(0)) revert BadHash();
        uint256 elapsedAt = trade.inspectionOpenedAt + trade.inspectionWindow;
        if (block.timestamp >= elapsedAt) revert InspectionWindowElapsed(elapsedAt);
        trade.state = State.Disputed;
        trade.disputeReasonHash = reasonHash;
        emit Disputed(tradeId, reasonHash);
    }

    function resolve(uint256 tradeId, Outcome outcome, uint16 splitBps)
        external
        existingTrade(tradeId)
        nonReentrant
    {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.arbiter) revert Unauthorized();
        if (trade.state != State.Disputed) revert BadState(trade.state);

        uint256 buyerAmount;
        uint256 sellerAmount;
        if (outcome == Outcome.SELLER) {
            if (splitBps != 0) revert BadSplitBps();
            sellerAmount = trade.usdcAmount;
        } else if (outcome == Outcome.BUYER) {
            if (splitBps != 0) revert BadSplitBps();
            if (!trade.returnCustodyConfirmed) revert ReturnCustodyRequired();
            buyerAmount = trade.usdcAmount;
            splitBps = uint16(BPS_DENOMINATOR);
        } else {
            if (splitBps == 0 || splitBps >= BPS_DENOMINATOR) revert BadSplitBps();
            if (!trade.returnCustodyConfirmed) revert ReturnCustodyRequired();
            buyerAmount = (trade.usdcAmount * splitBps) / BPS_DENOMINATOR;
            sellerAmount = trade.usdcAmount - buyerAmount;
        }

        trade.state = State.Resolved;
        trade.resolvedOutcome = outcome;
        trade.buyerRefundBps = splitBps;

        if (buyerAmount != 0) {
            _safeTransfer(trade.buyer, buyerAmount);
            emit Refunded(tradeId, trade.buyer, buyerAmount);
        }
        if (sellerAmount != 0) {
            _safeTransfer(trade.seller, sellerAmount);
        }
        emit Resolved(tradeId, outcome, splitBps, buyerAmount, sellerAmount);
    }

    function confirmReturnCustody(uint256 tradeId) external existingTrade(tradeId) {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.seller && msg.sender != trade.arbiter) revert Unauthorized();
        if (trade.state != State.Disputed) revert BadState(trade.state);
        trade.returnCustodyConfirmed = true;
        emit ReturnCustodyConfirmed(tradeId, msg.sender);
    }

    function cancelBeforeShip(uint256 tradeId) external existingTrade(tradeId) nonReentrant {
        Trade storage trade = trades[tradeId];
        if (msg.sender != trade.buyer && msg.sender != trade.seller) revert Unauthorized();
        if (trade.state != State.Funded) revert BadState(trade.state);
        uint256 amount = trade.usdcAmount;
        trade.state = State.Cancelled;
        _safeTransfer(trade.buyer, amount);
        emit Refunded(tradeId, trade.buyer, amount);
        emit Cancelled(tradeId);
    }

    function inspectionDeadline(uint256 tradeId)
        external
        view
        existingTrade(tradeId)
        returns (uint256)
    {
        Trade storage trade = trades[tradeId];
        if (trade.inspectionOpenedAt == 0) return 0;
        return trade.inspectionOpenedAt + trade.inspectionWindow;
    }

    function _openInspection(uint256 tradeId, Trade storage trade) internal {
        if (trade.state != State.Shipped) revert BadState(trade.state);
        trade.state = State.InspectionOpen;
        trade.inspectionOpenedAt = block.timestamp;
        emit InspectionOpened(tradeId, block.timestamp + trade.inspectionWindow);
    }

    function _safeTransfer(address to, uint256 amount) internal {
        if (!USDC.transfer(to, amount)) revert TransferFailed();
    }

    function _safeTransferFrom(address from, address to, uint256 amount) internal {
        if (!USDC.transferFrom(from, to, amount)) revert TransferFailed();
    }
}
