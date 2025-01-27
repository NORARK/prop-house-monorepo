import {
  StoredProposalWithVotes,
  StoredAuctionBase,
} from '@nouns/prop-house-wrapper/dist/builders';
import classes from './RoundContent.module.css';
import { auctionStatus, AuctionStatus } from '../../utils/auctionStatus';
import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../hooks';
import { PropHouseWrapper } from '@nouns/prop-house-wrapper';
import { refreshActiveProposals } from '../../utils/refreshActiveProposal';
import ErrorMessageCard from '../ErrorMessageCard';
import VoteConfirmationModal from '../VoteConfirmationModal';
import SuccessVotingModal from '../SuccessVotingModal';
import ErrorVotingModal from '../ErrorVotingModal';
import {
  clearVoteAllotments,
  setVotesByUserInActiveRound,
  setVotingPower,
} from '../../state/slices/voting';
import { Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import RoundModules from '../RoundModules';
import { useAccount, useBlockNumber } from 'wagmi';
import ProposalCard from '../ProposalCard';
import { cardStatus } from '../../utils/cardStatus';
import isWinner from '../../utils/isWinner';
import getWinningIds from '../../utils/getWinningIds';
import { InfRoundFilterType } from '../../state/slices/propHouse';
import { isInfAuction, isTimedAuction } from '../../utils/auctionType';
import { execStrategy } from '@prophouse/communities/dist/actions/execStrategy';
import { useEthersSigner } from '../../hooks/useEthersSigner';
import { submitVotes } from '../../utils/submitVotes';
import { signerIsContract } from '../../utils/signerIsContract';
import { useEthersProvider } from '../../hooks/useEthersProvider';

const RoundContent: React.FC<{
  auction: StoredAuctionBase;
  proposals: StoredProposalWithVotes[];
}> = props => {
  const { auction, proposals } = props;
  const { address: account } = useAccount();
  const { data: blocknumber } = useBlockNumber({ chainId: auction.voteStrategy.chainId ?? 1 });

  const [showVoteConfirmationModal, setShowVoteConfirmationModal] = useState(false);
  const [showSuccessVotingModal, setShowSuccessVotingModal] = useState(false);
  const [isContract, setIsContract] = useState(false);
  const [numPropsVotedFor, setNumPropsVotedFor] = useState(0);
  const [showErrorVotingModal, setShowErrorVotingModal] = useState(false);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const community = useAppSelector(state => state.propHouse.activeCommunity);
  const votingPower = useAppSelector(state => state.voting.votingPower);
  const infRoundFilter = useAppSelector(state => state.propHouse.infRoundFilterType);

  const voteAllotments = useAppSelector(state => state.voting.voteAllotments);
  const host = useAppSelector(state => state.configuration.backendHost);

  const client = useRef(new PropHouseWrapper(host));
  const signer = useEthersSigner();
  const provider = useEthersProvider({
    chainId: auction.voteStrategy.chainId ? auction.voteStrategy.chainId : 1,
  });

  const staleProp = isInfAuction(auction) && infRoundFilter === InfRoundFilterType.Stale;
  const warningMessage = isTimedAuction(auction)
    ? t('submittedProposals')
    : infRoundFilter === InfRoundFilterType.Active
    ? 'Active proposals will show up here.'
    : infRoundFilter === InfRoundFilterType.Rejected
    ? 'Proposals that meet the rejection quorum will show up here.'
    : infRoundFilter === InfRoundFilterType.Winners
    ? 'Proposals that meet the winner quorum will show up here.'
    : 'Proposals that did not meet quorum before voting period ended will show up here.';

  useEffect(() => {
    client.current = new PropHouseWrapper(host, signer);
  }, [signer, host]);

  // fetch voting power for user
  useEffect(() => {
    if (!account || !signer || !community) return;

    const fetchVotes = async () => {
      try {
        const strategyPayload = {
          strategyName: auction.voteStrategy.strategyName,
          account,
          provider,
          ...auction.voteStrategy,
        };
        const votes = await execStrategy(strategyPayload);

        dispatch(setVotingPower(votes));
      } catch (e) {
        console.log('error fetching votes: ', e);
      }
    };
    fetchVotes();
  }, [
    account,
    signer,
    dispatch,
    community,
    auction.balanceBlockTag,
    auction.voteStrategy,
    provider,
  ]);

  // update submitted votes on proposal changes
  useEffect(() => {
    const votes = proposals.flatMap(p => (p.votes ? p.votes : []));
    if (proposals && account && votes.length > 0)
      dispatch(setVotesByUserInActiveRound(votes.filter(v => v.address === account)));
  }, [proposals, account, dispatch]);

  const handleSubmitVote = async () => {
    if (!community || !blocknumber) return;

    try {
      setIsContract(
        await signerIsContract(
          signer ? signer : undefined,
          provider,
          account ? account : undefined,
        ),
      );
      await submitVotes(voteAllotments, Number(blocknumber), community, client.current, isContract);

      setShowErrorVotingModal(false);
      setNumPropsVotedFor(voteAllotments.length);
      setShowSuccessVotingModal(true);
      refreshActiveProposals(client.current, auction, dispatch);
      dispatch(clearVoteAllotments());
      setShowVoteConfirmationModal(false);
    } catch (e) {
      console.log(e);
      setShowErrorVotingModal(true);
    }
  };

  return (
    <>
      {showVoteConfirmationModal && (
        <VoteConfirmationModal
          setShowVoteConfirmationModal={setShowVoteConfirmationModal}
          submitVote={handleSubmitVote}
        />
      )}

      {showSuccessVotingModal && (
        <SuccessVotingModal
          setShowSuccessVotingModal={setShowSuccessVotingModal}
          numPropsVotedFor={numPropsVotedFor}
          signerIsContract={isContract}
        />
      )}

      {showErrorVotingModal && (
        <ErrorVotingModal setShowErrorVotingModal={setShowErrorVotingModal} />
      )}

      {community && (
        <Row className={classes.propCardsRow}>
          <Col xl={8} className={classes.propCardsCol}>
            {auctionStatus(auction) === AuctionStatus.AuctionNotStarted ? (
              <ErrorMessageCard message={'Round starting soon'} date={auction.startTime} />
            ) : proposals.length === 0 ? (
              <ErrorMessageCard message={warningMessage} />
            ) : (
              <>
                {proposals.map((prop, index) => (
                  <Col key={index}>
                    <ProposalCard
                      proposal={prop}
                      auctionStatus={auctionStatus(auction)}
                      cardStatus={cardStatus(votingPower > 0, auction)}
                      isWinner={isWinner(getWinningIds(proposals, auction), prop.id)}
                      stale={staleProp}
                    />
                  </Col>
                ))}
              </>
            )}
          </Col>
          <RoundModules
            auction={auction}
            proposals={proposals}
            community={community}
            setShowVotingModal={setShowVoteConfirmationModal}
          />
        </Row>
      )}
    </>
  );
};

export default RoundContent;
