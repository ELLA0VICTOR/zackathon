// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, euint16, euint32, euint64, euint128, euint256, externalEuint256, externalEuint16, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Zackathon
 * @notice Decentralized hackathon platform with encrypted submissions using FHEVM v0.9
 * @dev Implements fully homomorphic encryption for submission privacy until judging phase
 * 
 * TESTING OPTIMIZATIONS:
 * - Minimum judges reduced to 1 (was 3)
 * - This allows faster testing without needing 3 judge wallets
 * - For production, recommended to increase back to 3+ judges
 */
contract Zackathon is ZamaEthereumConfig {
    
    // ============ Enums ============
    
    enum HackathonStatus {
        RegistrationOpen,
        SubmissionsOpen,
        Judging,
        Completed
    }
    
    enum SubmissionStatus {
        Pending,
        Judged
    }
    
    // ============ Structs ============
    
    struct Hackathon {
        uint256 id;
        string name;
        string description;
        string prizeDetails;
        uint256 submissionDeadline;
        uint256 judgingDeadline;
        address organizer;
        address[] judges;
        uint256 maxParticipants;
        HackathonStatus status;
        uint256 participantCount;
        uint256 submissionCount;
        bool judgeAccessGranted;
    }
    
    struct Participant {
        address wallet;
        string email;
        string discord;
        string twitter;
        string teamName;
        address[] teamMembers;
        uint256 registrationTime;
        bool hasSubmitted;
    }
    
    struct Submission {
        uint256 submissionId;
        address participant;
        euint256 encryptedIPFSHash;
        uint256 submissionTime;
        SubmissionStatus status;
        uint256 totalScores;
        uint256 judgeCount;
    }
    
    struct Winner {
        address participant;
        uint256 ranking;
        uint256 finalScore;
        uint256 submissionId;
    }
    
    struct DecryptedScore {
        uint256 score;
        bool isDecrypted;
    }
    
    // ============ State Variables ============
    
    uint256 public hackathonCounter;
    
    mapping(uint256 => Hackathon) public hackathons;
    mapping(uint256 => mapping(address => Participant)) public participants;
    mapping(uint256 => address[]) public participantList;
    mapping(uint256 => Submission[]) public submissions;
    mapping(uint256 => mapping(uint256 => mapping(address => euint16))) public scores;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasJudgeScored;
    mapping(uint256 => Winner[]) public winners;
    mapping(uint256 => mapping(address => bool)) public isJudge;
    mapping(uint256 => mapping(address => bool)) public hasRegistered;
    
    // For public decryption workflow
    mapping(uint256 => mapping(uint256 => euint256)) public publicDecryptableScores;
    mapping(uint256 => mapping(uint256 => DecryptedScore)) public decryptedScores;
    
    // ============ Events ============
    
    event HackathonCreated(
        uint256 indexed hackathonId,
        string name,
        address indexed organizer,
        uint256 submissionDeadline,
        uint256 judgingDeadline
    );
    
    event ParticipantRegistered(
        uint256 indexed hackathonId,
        address indexed participant,
        string email
    );
    
    event ProjectSubmitted(
        uint256 indexed hackathonId,
        uint256 indexed submissionId,
        address indexed participant,
        uint256 submissionTime
    );
    
    event JudgeAccessGranted(
        uint256 indexed hackathonId,
        uint256 submissionCount
    );
    
    event ScoreSubmitted(
        uint256 indexed hackathonId,
        uint256 indexed submissionId,
        address indexed judge
    );
    
    event WinnersCalculated(
        uint256 indexed hackathonId,
        uint256 winnerCount
    );
    
    event WinnersAnnounced(
        uint256 indexed hackathonId,
        address indexed firstPlace,
        address indexed secondPlace,
        address thirdPlace
    );
    
    event ScoreDecrypted(
        uint256 indexed hackathonId,
        uint256 indexed submissionId,
        uint256 score
    );
    
    // ============ Modifiers ============
    
    modifier onlyOrganizer(uint256 hackathonId) {
        require(
            hackathons[hackathonId].organizer == msg.sender,
            "Only organizer"
        );
        _;
    }
    
    modifier onlyJudge(uint256 hackathonId) {
        require(isJudge[hackathonId][msg.sender], "Only judge");
        _;
    }
    
    modifier hackathonExists(uint256 hackathonId) {
        require(hackathonId > 0 && hackathonId <= hackathonCounter, "Invalid hackathon");
        _;
    }
    
    modifier beforeSubmissionDeadline(uint256 hackathonId) {
        require(
            block.timestamp < hackathons[hackathonId].submissionDeadline,
            "Submission deadline passed"
        );
        _;
    }
    
    modifier afterSubmissionDeadline(uint256 hackathonId) {
        require(
            block.timestamp >= hackathons[hackathonId].submissionDeadline,
            "Submission deadline not reached"
        );
        _;
    }
    
    modifier beforeJudgingDeadline(uint256 hackathonId) {
        require(
            block.timestamp < hackathons[hackathonId].judgingDeadline,
            "Judging deadline passed"
        );
        _;
    }
    
    modifier afterJudgingDeadline(uint256 hackathonId) {
        require(
            block.timestamp >= hackathons[hackathonId].judgingDeadline,
            "Judging deadline not reached"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        hackathonCounter = 0;
    }
    
    // ============ Organizer Functions ============
    
    /**
     * @notice Create a new hackathon
     * @param name Hackathon name
     * @param description Hackathon description
     * @param prizeDetails Prize information
     * @param submissionDeadline Timestamp for submission deadline
     * @param judgingDeadline Timestamp for judging deadline
     * @param maxParticipants Maximum number of participants (0 for unlimited)
     * @param judges Array of judge addresses
     * @return hackathonId The ID of the created hackathon
     * 
     * TESTING NOTE: Minimum judges reduced to 1 (was 3) for faster testing
     */
    function createHackathon(
        string memory name,
        string memory description,
        string memory prizeDetails,
        uint256 submissionDeadline,
        uint256 judgingDeadline,
        uint256 maxParticipants,
        address[] memory judges
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(submissionDeadline > block.timestamp, "Invalid submission deadline");
        require(judgingDeadline > submissionDeadline, "Invalid judging deadline");
        require(judges.length >= 1, "Minimum 1 judge required"); // CHANGED FROM 3 TO 1
        
        hackathonCounter++;
        uint256 hackathonId = hackathonCounter;
        
        Hackathon storage newHackathon = hackathons[hackathonId];
        newHackathon.id = hackathonId;
        newHackathon.name = name;
        newHackathon.description = description;
        newHackathon.prizeDetails = prizeDetails;
        newHackathon.submissionDeadline = submissionDeadline;
        newHackathon.judgingDeadline = judgingDeadline;
        newHackathon.organizer = msg.sender;
        newHackathon.maxParticipants = maxParticipants;
        newHackathon.status = HackathonStatus.RegistrationOpen;
        newHackathon.participantCount = 0;
        newHackathon.submissionCount = 0;
        newHackathon.judgeAccessGranted = false;
        
        for (uint256 i = 0; i < judges.length; i++) {
            require(judges[i] != address(0), "Invalid judge address");
            require(judges[i] != msg.sender, "Organizer cannot be judge");
            newHackathon.judges.push(judges[i]);
            isJudge[hackathonId][judges[i]] = true;
        }
        
        emit HackathonCreated(
            hackathonId,
            name,
            msg.sender,
            submissionDeadline,
            judgingDeadline
        );
        
        return hackathonId;
    }
    
    /**
     * @notice Grant judges access to encrypted submissions after deadline
     * @param hackathonId The hackathon ID
     */
    function grantJudgeAccess(uint256 hackathonId)
        external
        onlyOrganizer(hackathonId)
        hackathonExists(hackathonId)
        afterSubmissionDeadline(hackathonId)
    {
        require(!hackathons[hackathonId].judgeAccessGranted, "Access already granted");
        require(submissions[hackathonId].length > 0, "No submissions");
        
        Hackathon storage hackathon = hackathons[hackathonId];
        Submission[] storage hackathonSubmissions = submissions[hackathonId];
        
        for (uint256 i = 0; i < hackathonSubmissions.length; i++) {
            euint256 encryptedHash = hackathonSubmissions[i].encryptedIPFSHash;
            
            for (uint256 j = 0; j < hackathon.judges.length; j++) {
                FHE.allow(encryptedHash, hackathon.judges[j]);
            }
            
            FHE.allowThis(encryptedHash);
        }
        
        hackathon.judgeAccessGranted = true;
        hackathon.status = HackathonStatus.Judging;
        
        emit JudgeAccessGranted(hackathonId, hackathonSubmissions.length);
    }
    
    /**
     * @notice Calculate winners using encrypted scores
     * @param hackathonId The hackathon ID
     */
    function calculateWinners(uint256 hackathonId)
        external
        onlyOrganizer(hackathonId)
        hackathonExists(hackathonId)
        afterJudgingDeadline(hackathonId)
    {
        require(
            hackathons[hackathonId].status == HackathonStatus.Judging,
            "Not in judging phase"
        );
        
        Submission[] storage hackathonSubmissions = submissions[hackathonId];
        require(hackathonSubmissions.length > 0, "No submissions");
        
        uint256 judgeCount = hackathons[hackathonId].judges.length;
        
        for (uint256 i = 0; i < hackathonSubmissions.length; i++) {
            uint256 scoredJudges = 0;
            for (uint256 j = 0; j < judgeCount; j++) {
                address judge = hackathons[hackathonId].judges[j];
                if (hasJudgeScored[hackathonId][i][judge]) {
                    scoredJudges++;
                }
            }
            require(scoredJudges == judgeCount, "Not all judges scored");
        }
        
        for (uint256 i = 0; i < hackathonSubmissions.length; i++) {
            euint64 totalScore = FHE.asEuint64(0);
            
            for (uint256 j = 0; j < judgeCount; j++) {
                address judge = hackathons[hackathonId].judges[j];
                euint16 judgeScore = scores[hackathonId][i][judge];
                euint64 score64 = FHE.asEuint64(judgeScore);
                totalScore = FHE.add(totalScore, score64);
            }
            
            publicDecryptableScores[hackathonId][i] = FHE.asEuint256(totalScore);
            FHE.makePubliclyDecryptable(publicDecryptableScores[hackathonId][i]);
        }
        
        hackathons[hackathonId].status = HackathonStatus.Completed;
        
        emit WinnersCalculated(hackathonId, hackathonSubmissions.length);
    }
    
    /**
     * @notice Submit decrypted scores and determine winners
     * @param hackathonId The hackathon ID
     * @param clearScores Array of decrypted scores in order
     * @param decryptionProof Proof from public decryption
     */
    function submitDecryptedScores(
        uint256 hackathonId,
        uint256[] memory clearScores,
        bytes memory decryptionProof
    )
        external
        onlyOrganizer(hackathonId)
        hackathonExists(hackathonId)
    {
        require(
            hackathons[hackathonId].status == HackathonStatus.Completed,
            "Winners not calculated"
        );
        
        Submission[] storage hackathonSubmissions = submissions[hackathonId];
        require(clearScores.length == hackathonSubmissions.length, "Score count mismatch");
        
        bytes32[] memory handlesList = new bytes32[](clearScores.length);
        for (uint256 i = 0; i < clearScores.length; i++) {
            handlesList[i] = FHE.toBytes32(publicDecryptableScores[hackathonId][i]);
        }
        
        bytes memory abiEncodedScores = abi.encode(clearScores);
        FHE.checkSignatures(handlesList, abiEncodedScores, decryptionProof);
        
        for (uint256 i = 0; i < clearScores.length; i++) {
            decryptedScores[hackathonId][i] = DecryptedScore({
                score: clearScores[i],
                isDecrypted: true
            });
            
            emit ScoreDecrypted(hackathonId, i, clearScores[i]);
        }
        
        uint256 firstPlace = 0;
        uint256 secondPlace = 0;
        uint256 thirdPlace = 0;
        uint256 maxScore = 0;
        uint256 secondMaxScore = 0;
        uint256 thirdMaxScore = 0;
        
        for (uint256 i = 0; i < clearScores.length; i++) {
            if (clearScores[i] > maxScore) {
                thirdMaxScore = secondMaxScore;
                thirdPlace = secondPlace;
                secondMaxScore = maxScore;
                secondPlace = firstPlace;
                maxScore = clearScores[i];
                firstPlace = i;
            } else if (clearScores[i] > secondMaxScore) {
                thirdMaxScore = secondMaxScore;
                thirdPlace = secondPlace;
                secondMaxScore = clearScores[i];
                secondPlace = i;
            } else if (clearScores[i] > thirdMaxScore) {
                thirdMaxScore = clearScores[i];
                thirdPlace = i;
            }
        }
        
        delete winners[hackathonId];
        
        if (hackathonSubmissions.length >= 1) {
            winners[hackathonId].push(Winner({
                participant: hackathonSubmissions[firstPlace].participant,
                ranking: 1,
                finalScore: maxScore,
                submissionId: firstPlace
            }));
        }
        
        if (hackathonSubmissions.length >= 2) {
            winners[hackathonId].push(Winner({
                participant: hackathonSubmissions[secondPlace].participant,
                ranking: 2,
                finalScore: secondMaxScore,
                submissionId: secondPlace
            }));
        }
        
        if (hackathonSubmissions.length >= 3) {
            winners[hackathonId].push(Winner({
                participant: hackathonSubmissions[thirdPlace].participant,
                ranking: 3,
                finalScore: thirdMaxScore,
                submissionId: thirdPlace
            }));
        }
        
        address first = hackathonSubmissions.length >= 1 ? hackathonSubmissions[firstPlace].participant : address(0);
        address second = hackathonSubmissions.length >= 2 ? hackathonSubmissions[secondPlace].participant : address(0);
        address third = hackathonSubmissions.length >= 3 ? hackathonSubmissions[thirdPlace].participant : address(0);
        
        emit WinnersAnnounced(hackathonId, first, second, third);
    }
    
    // ============ Participant Functions ============
    
    /**
     * @notice Register for a hackathon
     * @param hackathonId The hackathon ID
     * @param email Participant email (must match Zama Guild)
     * @param discord Discord username
     * @param twitter Twitter/X profile URL
     * @param teamName Team name (optional)
     * @param teamMembers Array of team member addresses (optional)
     */
    function registerForHackathon(
        uint256 hackathonId,
        string memory email,
        string memory discord,
        string memory twitter,
        string memory teamName,
        address[] memory teamMembers
    )
        external
        hackathonExists(hackathonId)
        beforeSubmissionDeadline(hackathonId)
    {
        require(!hasRegistered[hackathonId][msg.sender], "Already registered");
        require(bytes(email).length > 0, "Email required");
        require(!isJudge[hackathonId][msg.sender], "Judges cannot participate");
        
        Hackathon storage hackathon = hackathons[hackathonId];
        
        if (hackathon.maxParticipants > 0) {
            require(
                hackathon.participantCount < hackathon.maxParticipants,
                "Max participants reached"
            );
        }
        
        Participant storage newParticipant = participants[hackathonId][msg.sender];
        newParticipant.wallet = msg.sender;
        newParticipant.email = email;
        newParticipant.discord = discord;
        newParticipant.twitter = twitter;
        newParticipant.teamName = teamName;
        newParticipant.teamMembers = teamMembers;
        newParticipant.registrationTime = block.timestamp;
        newParticipant.hasSubmitted = false;
        
        participantList[hackathonId].push(msg.sender);
        hasRegistered[hackathonId][msg.sender] = true;
        hackathon.participantCount++;
        
        if (hackathon.status == HackathonStatus.RegistrationOpen) {
            hackathon.status = HackathonStatus.SubmissionsOpen;
        }
        
        emit ParticipantRegistered(hackathonId, msg.sender, email);
    }
    
    /**
     * @notice Submit encrypted project IPFS hash
     * @param hackathonId The hackathon ID
     * @param encryptedIPFSHash Encrypted IPFS hash
     * @param inputProof ZK proof for encrypted input
     */
    function submitProject(
        uint256 hackathonId,
        externalEuint256 encryptedIPFSHash,
        bytes calldata inputProof
    )
        external
        hackathonExists(hackathonId)
        beforeSubmissionDeadline(hackathonId)
    {
        require(hasRegistered[hackathonId][msg.sender], "Not registered");
        require(
            !participants[hackathonId][msg.sender].hasSubmitted,
            "Already submitted"
        );
        
        euint256 validatedHash = FHE.fromExternal(encryptedIPFSHash, inputProof);
        
        FHE.allowThis(validatedHash);
        FHE.allow(validatedHash, msg.sender);
        
        uint256 submissionId = submissions[hackathonId].length;
        
        Submission memory newSubmission = Submission({
            submissionId: submissionId,
            participant: msg.sender,
            encryptedIPFSHash: validatedHash,
            submissionTime: block.timestamp,
            status: SubmissionStatus.Pending,
            totalScores: 0,
            judgeCount: 0
        });
        
        submissions[hackathonId].push(newSubmission);
        participants[hackathonId][msg.sender].hasSubmitted = true;
        hackathons[hackathonId].submissionCount++;
        
        emit ProjectSubmitted(hackathonId, submissionId, msg.sender, block.timestamp);
    }
    
    // ============ Judge Functions ============
    
    /**
     * @notice Submit encrypted score for a submission
     * @param hackathonId The hackathon ID
     * @param submissionId The submission ID
     * @param encryptedScore Encrypted score (1-50 range, 5 categories * 10 max)
     * @param inputProof ZK proof for encrypted input
     */
    function submitScore(
        uint256 hackathonId,
        uint256 submissionId,
        externalEuint16 encryptedScore,
        bytes calldata inputProof
    )
        external
        hackathonExists(hackathonId)
        onlyJudge(hackathonId)
        afterSubmissionDeadline(hackathonId)
        beforeJudgingDeadline(hackathonId)
    {
        require(hackathons[hackathonId].judgeAccessGranted, "Judge access not granted");
        require(submissionId < submissions[hackathonId].length, "Invalid submission");
        require(
            !hasJudgeScored[hackathonId][submissionId][msg.sender],
            "Already scored"
        );
        
        euint16 validatedScore = FHE.fromExternal(encryptedScore, inputProof);
        
        FHE.allowThis(validatedScore);
        FHE.allow(validatedScore, msg.sender);
        
        scores[hackathonId][submissionId][msg.sender] = validatedScore;
        hasJudgeScored[hackathonId][submissionId][msg.sender] = true;
        
        submissions[hackathonId][submissionId].judgeCount++;
        submissions[hackathonId][submissionId].status = SubmissionStatus.Judged;
        
        emit ScoreSubmitted(hackathonId, submissionId, msg.sender);
    }
    
    /**
     * @notice Get encrypted IPFS hash for a submission (judges only after access granted)
     * @param hackathonId The hackathon ID
     * @param submissionId The submission ID
     * @return The encrypted IPFS hash
     */
    function getSubmissionIPFSHash(uint256 hackathonId, uint256 submissionId)
        external
        view
        hackathonExists(hackathonId)
        onlyJudge(hackathonId)
        returns (euint256)
    {
        require(hackathons[hackathonId].judgeAccessGranted, "Access not granted");
        require(submissionId < submissions[hackathonId].length, "Invalid submission");
        
        return submissions[hackathonId][submissionId].encryptedIPFSHash;
    }
    
    // ============ View Functions ============
    
    function getHackathonDetails(uint256 hackathonId)
        external
        view
        hackathonExists(hackathonId)
        returns (
            uint256 id,
            string memory name,
            string memory description,
            string memory prizeDetails,
            uint256 submissionDeadline,
            uint256 judgingDeadline,
            address organizer,
            address[] memory judges,
            uint256 maxParticipants,
            HackathonStatus status,
            uint256 participantCount,
            uint256 submissionCount,
            bool judgeAccessGranted
        )
    {
        Hackathon storage h = hackathons[hackathonId];
        return (
            h.id,
            h.name,
            h.description,
            h.prizeDetails,
            h.submissionDeadline,
            h.judgingDeadline,
            h.organizer,
            h.judges,
            h.maxParticipants,
            h.status,
            h.participantCount,
            h.submissionCount,
            h.judgeAccessGranted
        );
    }
    
    function getParticipant(uint256 hackathonId, address participantAddress)
        external
        view
        hackathonExists(hackathonId)
        returns (
            address wallet,
            string memory email,
            string memory discord,
            string memory twitter,
            string memory teamName,
            address[] memory teamMembers,
            uint256 registrationTime,
            bool hasSubmitted
        )
    {
        Participant storage p = participants[hackathonId][participantAddress];
        return (
            p.wallet,
            p.email,
            p.discord,
            p.twitter,
            p.teamName,
            p.teamMembers,
            p.registrationTime,
            p.hasSubmitted
        );
    }
    
    function getParticipantList(uint256 hackathonId)
        external
        view
        hackathonExists(hackathonId)
        returns (address[] memory)
    {
        return participantList[hackathonId];
    }
    
    function getSubmissionCount(uint256 hackathonId)
        external
        view
        hackathonExists(hackathonId)
        returns (uint256)
    {
        return submissions[hackathonId].length;
    }
    
    function getSubmission(uint256 hackathonId, uint256 submissionId)
        external
        view
        hackathonExists(hackathonId)
        returns (
            uint256 id,
            address participant,
            uint256 submissionTime,
            SubmissionStatus status,
            uint256 judgeCount
        )
    {
        require(submissionId < submissions[hackathonId].length, "Invalid submission");
        Submission storage s = submissions[hackathonId][submissionId];
        return (
            s.submissionId,
            s.participant,
            s.submissionTime,
            s.status,
            s.judgeCount
        );
    }
    
    function getWinners(uint256 hackathonId)
        external
        view
        hackathonExists(hackathonId)
        returns (Winner[] memory)
    {
        return winners[hackathonId];
    }
    
    function getDecryptedScore(uint256 hackathonId, uint256 submissionId)
        external
        view
        hackathonExists(hackathonId)
        returns (uint256 score, bool isDecrypted)
    {
        DecryptedScore storage ds = decryptedScores[hackathonId][submissionId];
        return (ds.score, ds.isDecrypted);
    }
    
    function isHackathonJudge(uint256 hackathonId, address judge)
        external
        view
        hackathonExists(hackathonId)
        returns (bool)
    {
        return isJudge[hackathonId][judge];
    }
    
    function getTotalHackathons() external view returns (uint256) {
        return hackathonCounter;
    }
}