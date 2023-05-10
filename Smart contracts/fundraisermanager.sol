// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.17;

import "./fundraiser.sol";

contract fundraisermanager {
    uint256 _fundraiserIDcounter;
    Fundraiser[] public fundraisers;
    mapping(address => uint256) public fundraiserIDs;

    function createfundraiser(
        uint256 _endTime,
        uint256 _fundingamount,
        string calldata _fundraisertitle,
        string calldata _fundraiserdescription
    ) external returns (bool) {
        require(_fundingamount > 0);
        require(_endTime > 5 minutes);

        uint256 fundraiserID = _fundraiserIDcounter;
        _fundraiserIDcounter++;
        Fundraiser fundraiser = new Fundraiser(
            msg.sender,
            _endTime,
            _fundingamount,
            _fundraisertitle,
            _fundraiserdescription
        );

        fundraisers.push(fundraiser);
        fundraiserIDs[address(fundraiser)] = fundraiserID;
        return true;
    }

    function getfundraisers()
        external
        view
        returns (address[] memory _fundraisers)
    {
        _fundraisers = new address[](_fundraiserIDcounter);
        for (uint256 i = 0; i < _fundraiserIDcounter; i++) {
            _fundraisers[i] = address(fundraisers[i]);
        }
        return _fundraisers;
    }

    function getfundraiserinfo(address[] calldata _fundraiserlist)
        external
        view
        returns (
            string[] memory fundraisertitle,
            string[] memory fundraiserdescription,
            uint256[] memory fundingamount,
            address[] memory organization,
            uint256[] memory endTime,
            uint256[] memory fundraiserState
        )
    {
        endTime = new uint256[](_fundraiserlist.length);
        fundingamount = new uint256[](_fundraiserlist.length);
        organization = new address[](_fundraiserlist.length);
        fundraisertitle = new string[](_fundraiserlist.length);
        fundraiserdescription = new string[](_fundraiserlist.length);
        fundraiserState = new uint256[](_fundraiserlist.length);

        for (uint256 i = 0; i < _fundraiserlist.length; i++) {
            uint256 fundraiserID = fundraiserIDs[_fundraiserlist[i]];
            fundraisertitle[i] = fundraisers[fundraiserID].fundraisertitle();
            fundraiserdescription[i] = fundraisers[fundraiserID]
                .fundraiserdescription();
            fundingamount[i] = fundraisers[fundraiserID].fundingamount();
            organization[i] = fundraisers[fundraiserID].organization();
            endTime[i] = fundraisers[fundraiserID].endTime();
            fundraiserState[i] = uint256(
                fundraisers[fundraiserID].getFundraiserState()
            );
        }
        return (
            fundraisertitle,
            fundraiserdescription,
            fundingamount,
            organization,
            endTime,
            fundraiserState
        );
    }
}
