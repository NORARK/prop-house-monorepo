import classes from './Community.module.css';
import { useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import ProfileHeader from '../../ProfileHeader';
import { useEffect, useRef, useState } from 'react';
import { useEthers } from '@usedapp/core';
import { PropHouseWrapper } from '@nouns/prop-house-wrapper';
import {
  setActiveAuction,
  setActiveCommunity,
  setAuctions,
} from '../../../state/slices/propHouse';
import { getName } from 'prop-house-communities';
import hardhatNoun from '../../../assets/hardhat-noun.png';
import InactiveCommunityCTA from '../../InactiveCommunityCTA';
import FullAuction from '../../FullAuction';
import dayjs from 'dayjs';
import ComingSoonCard from '../../ComingSoonCard';

const Community = () => {
  const location = useLocation();
  const contract_address = location.pathname.substring(
    1,
    location.pathname.length
  );

  const isValidAddress =
    contract_address && ethers.utils.isAddress(contract_address);

  const dispatch = useAppDispatch();
  const { library } = useEthers();
  const [inactiveCommName, setInactiveCommName] = useState<string>();
  const community = useAppSelector((state) => state.propHouse.activeCommunity);
  const activeAuction = useAppSelector(
    (state) => state.propHouse.activeAuction
  );
  const host = useAppSelector((state) => state.configuration.backendHost);
  const client = useRef(new PropHouseWrapper(host));

  useEffect(() => {
    client.current = new PropHouseWrapper(host, library?.getSigner());
  }, [library, host]);

  // fetch community
  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const community = await client.current.getCommunity(contract_address);
        community.auctions.sort((a, b) =>
          dayjs(a.createdDate) < dayjs(b.createdDate) ? 1 : -1
        );
        dispatch(setActiveCommunity(community));
        dispatch(setAuctions(community.auctions));
        dispatch(setActiveAuction(community.auctions[0]));
      } catch (e) {
        console.log(e);
      }
    };
    fetchCommunity();
  }, [contract_address, dispatch]);

  // fetch inactive commmunity
  useEffect(() => {
    if (!library || community || !contract_address) return;

    const fetchName = async () => {
      try {
        setInactiveCommName(await getName(contract_address, library));
      } catch (e) {
        console.log(e);
      }
    };

    fetchName();
  }, [library, community, contract_address, inactiveCommName]);

  const handleAuctionChange = (next: boolean) => {
    if (!activeAuction || !community || community.auctions.length === 0) return;

    const auctions = community.auctions;
    const index = community.auctions.findIndex(
      (a) => a.id === activeAuction.id
    );

    const updatedIndex = next
      ? auctions[index + 1]
        ? index + 1
        : index
      : auctions[index - 1]
      ? index - 1
      : index;

    dispatch(setActiveAuction(auctions[updatedIndex]));
  };

  const isFirstOrLastAuction = (): [boolean, boolean] => {
    if (!activeAuction || !community || community.auctions.length === 0)
      return [false, false];
    const index = community.auctions.findIndex(
      (a) => a.id === activeAuction.id
    );
    return index === 0 && community.auctions.length === 1
      ? [true, true]
      : index === 0
      ? [true, false]
      : index === community.auctions.length - 1
      ? [false, true]
      : [false, false];
  };

  if (!isValidAddress)
    return (
      <div className={classes.invalidAddressCard}>
        <img
          src={hardhatNoun}
          alt="invalid address noun"
          className={classes.invalidAddressNoun}
        />
        <div className={classes.textContainer}>
          <h1>404: Invalid URL</h1>
          <p>
            Please check that the url follows the format:
            <br />
            <code>prop.house/:nft_contract_address</code>
          </p>
        </div>
      </div>
    );

  return (
    <>
      <ProfileHeader
        community={community}
        inactiveComm={{
          name: inactiveCommName ? inactiveCommName : 'N/A',
          contractAddress: contract_address,
        }}
      />
      {community && activeAuction ? (
        <FullAuction
          auction={activeAuction}
          isFirstOrLastAuction={isFirstOrLastAuction}
          handleAuctionChange={handleAuctionChange}
        />
      ) : community && !activeAuction ? (
        <ComingSoonCard communityName={community.name} />
      ) : (
        <InactiveCommunityCTA
          communityName={community ? community.name : inactiveCommName}
        />
      )}
    </>
  );
};

export default Community;
