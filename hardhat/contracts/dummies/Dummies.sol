// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// In-memory stand-ins etched onto Ritual system slots during PlotSuite.

contract DummyWake {
    struct Job {
        bytes payload;
        address target;
        bool dead;
    }

    uint256 public cursor;
    mapping(uint256 => Job) public jobs;

    function approveScheduler(address) external {}

    function schedule(
        bytes calldata payload,
        uint32,
        uint32,
        uint32,
        uint32,
        uint32,
        uint256,
        uint256,
        uint256,
        address
    ) external returns (uint256 id) {
        if (cursor == 0) cursor = 1;
        id = cursor++;
        jobs[id] = Job({payload: payload, target: msg.sender, dead: false});
    }

    function cancel(uint256 id) external {
        jobs[id].dead = true;
    }

    function getCallState(uint256 id) external view returns (uint8) {
        if (jobs[id].target == address(0)) return 4;
        if (jobs[id].dead) return 3;
        return 0;
    }

    function nudge(uint256 id, uint256 executionIndex) external {
        Job storage j = jobs[id];
        require(j.target != address(0), "empty");
        bytes memory p = j.payload;
        require(p.length >= 36, "short");
        assembly {
            mstore(add(p, 36), executionIndex)
        }
        (bool ok, ) = j.target.call(p);
        require(ok, "nudge fail");
    }
}

contract DummySafe {
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public lockUntil;

    function deposit(uint256 lock) external payable {
        balanceOf[msg.sender] += msg.value;
        uint256 untilBlk = block.number + lock;
        if (untilBlk > lockUntil[msg.sender]) lockUntil[msg.sender] = untilBlk;
    }
}

contract DummyCrew {
    address public crew;
    bool public present = true;
    bool public mute;

    function plug(address crew_, bool present_) external {
        crew = crew_;
        present = present_;
    }

    function silence(bool v) external {
        mute = v;
    }

    function pickServiceByCapability(uint8, bool, uint256, uint256) external view returns (address, bool) {
        if (mute) revert("mute");
        return (crew, present);
    }
}

contract DummyGet {
    bool public mute;
    uint16 public code = 200;
    bytes public body = '{"price":4300}';
    string public note = "";
    bytes public raw;
    bool public useRaw;

    function load(uint16 c, bytes calldata b, string calldata n) external {
        mute = false;
        useRaw = false;
        code = c;
        body = b;
        note = n;
    }

    function silence(bool v) external {
        mute = v;
    }

    function smear(bytes calldata r) external {
        useRaw = true;
        raw = r;
        mute = false;
    }

    fallback() external {
        if (mute) revert();
        bytes memory o = useRaw
            ? raw
            : abi.encode(bytes(""), abi.encode(code, new string[](0), new string[](0), body, note));
        assembly {
            return(add(o, 32), mload(o))
        }
    }
}

contract DummyHatch {
    bool public mute;
    bool public empty;
    uint256 public n;

    function fix(uint256 v) external {
        mute = false;
        empty = false;
        n = v;
    }

    function silence(bool v) external {
        mute = v;
    }

    function wipe(bool v) external {
        empty = v;
    }

    fallback() external {
        if (mute) revert();
        if (empty) {
            assembly {
                return(0, 0)
            }
        }
        uint256 v = n;
        assembly {
            mstore(0x00, v)
            return(0x00, 32)
        }
    }
}
