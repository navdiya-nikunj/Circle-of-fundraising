// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.17;

//abstract
interface USDC {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract Fundraiser {
    uint256 public endTime;
    uint256 public startTime;
    address payable[] public donors;
    uint256 public fundingamount;
    address public organization;
    string public fundraisertitle;
    string public fundraiserdescription;
    USDC public usdc;
    enum FundraiserState {
        OPEN,
        ENDED
    }
    event Newfundraiser(address newDonor);
    event WithdrawFunds();
    event fundraiserclose();

    constructor(
        address _oragnization,
        uint256 _endTime,
        uint256 _fundingamount,
        string memory _fundraisertitle,
        string memory _fundraiserdescription
    ) {
        usdc = USDC(0x0FA8781a83E46826621b3BC094Ea2A0212e71B23);
        organization = _oragnization;
        endTime = block.timestamp + _endTime;
        startTime = block.timestamp;
        fundingamount = _fundingamount;
        fundraisertitle = _fundraisertitle;
        fundraiserdescription = _fundraiserdescription;
    }

    function getFundraiserState() public view returns (FundraiserState) {
        if (block.timestamp >= endTime) return FundraiserState.ENDED;
        return FundraiserState.OPEN;
    }

    function withdrawFunds() external returns (bool) {
        require(getFundraiserState() == FundraiserState.ENDED);
        require(msg.sender == organization);
        usdc.transfer(organization, fundingamount * donors.length);
        emit WithdrawFunds();
        emit fundraiserclose();
        return true;
    }

    function donate() external payable returns (bool) {
        require(msg.sender != organization);
        require(getFundraiserState() == FundraiserState.OPEN);
        usdc.transferFrom(msg.sender, address(this), fundingamount);
        donors.push(payable(msg.sender));
        emit Newfundraiser(msg.sender);
        return true;
    }

    function getAllfundraisers()
        external
        view
        returns (address payable[] memory _donors)
    {
        return donors;
    }
}
