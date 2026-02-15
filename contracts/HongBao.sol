// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract HongBao is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    uint256 public constant EXPIRY_DURATION = 24 hours;

    struct Packet {
        address sender;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 totalCount;
        uint256 remainingCount;
        bool isLucky;
        uint256 createdAt;
        bool refunded;
    }

    mapping(bytes32 => Packet) public packets;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    event PacketCreated(
        bytes32 indexed packetId,
        address indexed sender,
        uint256 totalAmount,
        uint256 totalCount,
        bool isLucky
    );

    event PacketClaimed(
        bytes32 indexed packetId,
        address indexed claimant,
        uint256 amount
    );

    event PacketRefunded(
        bytes32 indexed packetId,
        address indexed sender,
        uint256 amount
    );

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    function createPacket(
        bytes32 packetId,
        uint256 totalCount,
        uint256 totalAmount,
        bool isLucky
    ) external nonReentrant {
        require(packets[packetId].sender == address(0), "Packet already exists");
        require(totalCount > 0 && totalAmount > 0, "Invalid params");
        require(totalAmount >= totalCount, "Amount too small");

        usdc.transferFrom(msg.sender, address(this), totalAmount);

        packets[packetId] = Packet({
            sender: msg.sender,
            totalAmount: totalAmount,
            remainingAmount: totalAmount,
            totalCount: totalCount,
            remainingCount: totalCount,
            isLucky: isLucky,
            createdAt: block.timestamp,
            refunded: false
        });

        emit PacketCreated(packetId, msg.sender, totalAmount, totalCount, isLucky);
    }

    // Server calls this after verifying Farcaster identity
    function claimPacket(
        bytes32 packetId,
        address claimant,
        uint256 amount
    ) external onlyOwner nonReentrant {
        Packet storage p = packets[packetId];
        require(p.sender != address(0), "Packet not found");
        require(!p.refunded, "Packet refunded");
        require(block.timestamp <= p.createdAt + EXPIRY_DURATION, "Packet expired");
        require(p.remainingCount > 0, "Fully claimed");
        require(!hasClaimed[packetId][claimant], "Already claimed");
        require(amount <= p.remainingAmount, "Amount exceeds remaining");

        hasClaimed[packetId][claimant] = true;
        p.remainingAmount -= amount;
        p.remainingCount -= 1;

        usdc.transfer(claimant, amount);

        emit PacketClaimed(packetId, claimant, amount);
    }

    // Sender or owner can refund expired packets
    function refundPacket(bytes32 packetId) external nonReentrant {
        Packet storage p = packets[packetId];
        require(p.sender != address(0), "Packet not found");
        require(!p.refunded, "Already refunded");
        require(
            block.timestamp > p.createdAt + EXPIRY_DURATION || msg.sender == owner(),
            "Not expired yet"
        );
        require(p.remainingAmount > 0, "Nothing to refund");

        p.refunded = true;
        uint256 refundAmount = p.remainingAmount;
        p.remainingAmount = 0;

        usdc.transfer(p.sender, refundAmount);

        emit PacketRefunded(packetId, p.sender, refundAmount);
    }

    function getPacket(bytes32 packetId) external view returns (
        address sender,
        uint256 totalAmount,
        uint256 remainingAmount,
        uint256 totalCount,
        uint256 remainingCount,
        bool isLucky,
        uint256 createdAt,
        bool expired
    ) {
        Packet storage p = packets[packetId];
        return (
            p.sender,
            p.totalAmount,
            p.remainingAmount,
            p.totalCount,
            p.remainingCount,
            p.isLucky,
            p.createdAt,
            block.timestamp > p.createdAt + EXPIRY_DURATION || p.refunded
        );
    }
}
