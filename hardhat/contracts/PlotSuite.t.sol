// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RitualPredict} from "./RitualPredict.sol";
import {RitualChain} from "./ritual/RitualChain.sol";
import {DummyWake, DummySafe, DummyCrew, DummyGet, DummyHatch} from "./dummies/Dummies.sol";

contract PlotSuite is Test {
    RitualPredict loft;
    address rio;
    address nia;
    address crew;

    function setUp() public {
        rio = makeAddr("rio");
        nia = makeAddr("nia");
        crew = makeAddr("crew");
        vm.etch(RitualChain.SCHEDULER, address(new DummyWake()).code);
        vm.etch(RitualChain.RITUAL_WALLET, address(new DummySafe()).code);
        vm.etch(RitualChain.TEE_SERVICE_REGISTRY, address(new DummyCrew()).code);
        vm.etch(RitualChain.HTTP_PRECOMPILE, address(new DummyGet()).code);
        vm.etch(RitualChain.JQ_PRECOMPILE, address(new DummyHatch()).code);
        DummyCrew(RitualChain.TEE_SERVICE_REGISTRY).plug(crew, true);
        DummyGet(RitualChain.HTTP_PRECOMPILE).load(200, bytes('{"price":4300}'), "");
        DummyHatch(RitualChain.JQ_PRECOMPILE).fix(4300);
        loft = new RitualPredict(1000);
        vm.deal(rio, 90 ether);
        vm.deal(nia, 90 ether);
        vm.deal(address(this), 90 ether);
    }

    function _spec() internal pure returns (RitualPredict.NewMarket memory) {
        return RitualPredict.NewMarket({
            question: "Does ETH clear 4000 on the spec?",
            oracleUrl: "https://spec.example/eth",
            jsonPath: ".price",
            target: 4000,
            comparator: RitualPredict.Comparator.GTE,
            bettingSeconds: 30,
            resolveDelaySeconds: 15
        });
    }

    function _file() internal returns (uint256) {
        return loft.createMarket(_spec());
    }

    function _nudge(uint256 id) internal {
        RitualPredict.Market memory m = loft.getMarket(id);
        vm.roll(m.resolveBlock);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 0);
    }

    function testZeroMsReverts() public {
        vm.expectRevert(RitualPredict.BadDuration.selector);
        new RitualPredict(0);
    }

    function testSpanOnFile() public {
        uint256 id = _file();
        RitualPredict.Market memory m = loft.getMarket(id);
        assertEq(m.closeBlock, uint64(block.number + 30));
        assertEq(m.resolveBlock, uint64(block.number + 45));
        assertEq(m.scheduleId, 1);
    }

    function testDeadLocalhost() public {
        RitualPredict.NewMarket memory p = _spec();
        p.oracleUrl = "http://localhost/x";
        vm.expectRevert(RitualPredict.DeadUrl.selector);
        loft.createMarket(p);
    }

    function testDeadLoopback() public {
        RitualPredict.NewMarket memory p = _spec();
        p.oracleUrl = "https://127.0.0.1/x";
        vm.expectRevert(RitualPredict.DeadUrl.selector);
        loft.createMarket(p);
    }

    function testBentPath() public {
        RitualPredict.NewMarket memory p = _spec();
        p.jsonPath = "price";
        vm.expectRevert(RitualPredict.BentPath.selector);
        loft.createMarket(p);
    }

    function testBlankTitle() public {
        RitualPredict.NewMarket memory p = _spec();
        p.question = "";
        vm.expectRevert(RitualPredict.EmptyString.selector);
        loft.createMarket(p);
    }

    function testHairlineReverts() public {
        uint256 id = _file();
        vm.prank(rio);
        vm.expectRevert(RitualPredict.Hairline.selector);
        loft.bet{value: 0.003 ether}(id, true);
    }

    function testOverdrawnReverts() public {
        uint256 id = _file();
        vm.prank(rio);
        vm.expectRevert(RitualPredict.Overdrawn.selector);
        loft.bet{value: 26 ether}(id, true);
    }

    function testBothHatches() public {
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 5 ether}(id, true);
        vm.prank(nia);
        loft.bet{value: 2 ether}(id, false);
        assertEq(loft.getMarket(id).totalYes, 5 ether);
        assertEq(loft.getMarket(id).totalNo, 2 ether);
    }

    function testClosedInk() public {
        uint256 id = _file();
        vm.roll(loft.getMarket(id).closeBlock);
        vm.prank(rio);
        vm.expectRevert(RitualPredict.BettingClosed.selector);
        loft.bet{value: 1 ether}(id, true);
    }

    function testViewCloses() public {
        uint256 id = _file();
        vm.roll(loft.getMarket(id).closeBlock);
        assertEq(uint8(loft.getMarket(id).state), uint8(RitualPredict.MarketState.Closed));
    }

    function testOnlyWakeNudges() public {
        uint256 id = _file();
        vm.expectRevert(RitualPredict.OnlyScheduler.selector);
        loft.onScheduledResolve(0, id);
    }

    function testEarlyNudgeNoop() public {
        uint256 id = _file();
        DummyWake(RitualChain.SCHEDULER).nudge(loft.getMarket(id).scheduleId, 0);
        assertEq(loft.getMarket(id).attempts, 0);
    }

    function testYesOn4300() public {
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 1 ether}(id, true);
        vm.prank(nia);
        loft.bet{value: 1 ether}(id, false);
        _nudge(id);
        assertEq(uint8(loft.getMarket(id).outcome), uint8(RitualPredict.Outcome.Yes));
        assertEq(uint8(loft.getMarket(id).state), uint8(RitualPredict.MarketState.Resolved));
    }

    function testNoOn3900() public {
        DummyHatch(RitualChain.JQ_PRECOMPILE).fix(3900);
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 1 ether}(id, true);
        vm.prank(nia);
        loft.bet{value: 1 ether}(id, false);
        _nudge(id);
        assertEq(uint8(loft.getMarket(id).outcome), uint8(RitualPredict.Outcome.No));
    }

    function testGetDownNotNo() public {
        DummyGet(RitualChain.HTTP_PRECOMPILE).silence(true);
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 1 ether}(id, true);
        _nudge(id);
        assertEq(uint8(loft.getMarket(id).outcome), uint8(RitualPredict.Outcome.Unresolved));
    }

    function testThreeMutesVoid() public {
        DummyGet(RitualChain.HTTP_PRECOMPILE).silence(true);
        uint256 id = _file();
        RitualPredict.Market memory m = loft.getMarket(id);
        vm.roll(m.resolveBlock);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 0);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 1);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 2);
        assertEq(uint8(loft.getMarket(id).state), uint8(RitualPredict.MarketState.Invalid));
    }

    function testOneHatchVoids() public {
        uint256 id = _file();
        vm.prank(nia);
        loft.bet{value: 1 ether}(id, false);
        _nudge(id);
        assertEq(loft.getMarket(id).invalidReason, "one hatch");
    }

    function testPayoutSeven() public {
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 5 ether}(id, true);
        vm.prank(nia);
        loft.bet{value: 2 ether}(id, false);
        _nudge(id);
        uint256 b = rio.balance;
        vm.prank(rio);
        loft.claimWinnings(id);
        assertEq(rio.balance - b, 7 ether);
    }

    function testRefundAfterVoid() public {
        DummyGet(RitualChain.HTTP_PRECOMPILE).silence(true);
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 3 ether}(id, true);
        RitualPredict.Market memory m = loft.getMarket(id);
        vm.roll(m.resolveBlock);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 0);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 1);
        DummyWake(RitualChain.SCHEDULER).nudge(m.scheduleId, 2);
        uint256 b = rio.balance;
        vm.prank(rio);
        loft.claimRefund(id);
        assertEq(rio.balance - b, 3 ether);
    }

    function testSpanMatches() public {
        (uint64 c, uint64 r) = loft.spanFor(30, 15);
        uint256 id = _file();
        assertEq(c, loft.getMarket(id).closeBlock);
        assertEq(r, loft.getMarket(id).resolveBlock);
    }

    function testHoldUntilAfterInk() public {
        loft.fundExecution{value: 1 ether}(40);
        assertEq(loft.holdUntil(), block.number + 40);
    }

    function testSmearNotNo() public {
        DummyGet(RitualChain.HTTP_PRECOMPILE).smear(hex"dead");
        uint256 id = _file();
        _nudge(id);
        assertEq(uint8(loft.getMarket(id).outcome), uint8(RitualPredict.Outcome.Unresolved));
    }

    function testNoCrewMiss() public {
        DummyCrew(RitualChain.TEE_SERVICE_REGISTRY).plug(address(0), false);
        uint256 id = _file();
        _nudge(id);
        assertEq(uint8(loft.getMarket(id).state), uint8(RitualPredict.MarketState.Resolving));
    }

    function testLoserBlocked() public {
        uint256 id = _file();
        vm.prank(rio);
        loft.bet{value: 1 ether}(id, true);
        vm.prank(nia);
        loft.bet{value: 1 ether}(id, false);
        _nudge(id);
        vm.prank(nia);
        vm.expectRevert(RitualPredict.NothingToClaim.selector);
        loft.claimWinnings(id);
    }

    function testRuleFits() public view {
        assertTrue(loft.ruleFits(4000, 4000, RitualPredict.Comparator.GTE));
        assertFalse(loft.ruleFits(1, 2, RitualPredict.Comparator.GT));
    }

    function testShortBetWindow() public {
        RitualPredict.NewMarket memory p = _spec();
        p.bettingSeconds = 5;
        vm.expectRevert(RitualPredict.BadDuration.selector);
        loft.createMarket(p);
    }

    function testBareUrl() public {
        RitualPredict.NewMarket memory p = _spec();
        p.oracleUrl = "spec.example/eth";
        vm.expectRevert(RitualPredict.DeadUrl.selector);
        loft.createMarket(p);
    }

    function testFourSheetsKeepInk() public {
        uint256 a = _file();
        RitualPredict.NewMarket memory p = _spec();
        p.question = "Late sheet under 7500?";
        p.target = 7500;
        p.bettingSeconds = 400;
        uint256 b = loft.createMarket(p);
        p.question = "BTC hatch past 48000?";
        p.target = 48000;
        p.jsonPath = ".btc";
        uint256 c = loft.createMarket(p);
        p.question = "Slow mark stay at 1?";
        p.target = 1;
        p.jsonPath = ".slow";
        p.comparator = RitualPredict.Comparator.GTE;
        uint256 d = loft.createMarket(p);

        vm.prank(rio);
        loft.bet{value: 4 ether}(a, true);
        vm.prank(nia);
        loft.bet{value: 1 ether}(b, false);
        vm.prank(rio);
        loft.bet{value: 2 ether}(c, true);

        RitualPredict.Market[] memory board = loft.getMarkets();
        assertEq(board.length, 4);
        assertEq(board[0].id, d);

        uint256[] memory live = loft.liveSheets();
        assertEq(live.length, 4);

        _nudge(a);
        assertEq(uint8(loft.getMarket(a).state), uint8(RitualPredict.MarketState.Resolved));
        assertEq(uint8(loft.getMarket(b).state), uint8(RitualPredict.MarketState.Open));
        assertEq(loft.getMarket(b).totalNo, 1 ether);
        assertEq(loft.getMarket(c).totalYes, 2 ether);
        assertEq(loft.getMarket(d).totalYes, 0);
    }

    function testEmptyLoftHasNoLive() public view {
        uint256[] memory live = loft.liveSheets();
        assertEq(live.length, 0);
    }

    function testZeroStakeIsNotHairline() public {
        uint256 id = _file();
        vm.prank(rio);
        vm.expectRevert(RitualPredict.ZeroStake.selector);
        loft.bet{value: 0}(id, true);
    }

    function testLiveSheetsDropsClosed() public {
        uint256 a = _file();
        RitualPredict.NewMarket memory p = _spec();
        p.question = "Still selling";
        p.bettingSeconds = 400;
        uint256 b = loft.createMarket(p);
        vm.roll(loft.getMarket(a).closeBlock);
        uint256[] memory live = loft.liveSheets();
        assertEq(live.length, 1);
        assertEq(live[0], b);
    }
}
